import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Financeiro completo (Fase 5) — ao contrário do form simples de
 * "Valores (particular)" (getFinancialRecord/upsertParticularFinancialRecord
 * em lib/data/surgeries.ts, que só cuida de expected_value/agreed_value),
 * este módulo cobre os dois fluxos descritos em docs/ARCHITECTURE.md:
 *
 *   Particular: valor acordado → parcelas → recebimentos parciais → saldo.
 *   Convênio:   previsto → autorizado → faturado → recebido → glosa →
 *               recurso → recuperado/mantido.
 *
 * As 4 tabelas (financial_records, receivable_installments,
 * insurance_billing, insurance_glosas) já existem desde a migration
 * 0001 — este arquivo só adiciona o acesso que faltava.
 */

export type FinancialRecord = {
  id: string;
  surgery_id: string;
  attendance_type: "particular" | "convenio";
  expected_value: number | null;
  agreed_value: number | null;
  authorized_value: number | null;
  billed_value: number | null;
  received_value: number;
  glossed_value: number;
  adjusted_value: number;
  discount_value: number;
  payment_method: string | null;
  installments_count: number;
  due_date: string | null;
  notes: string | null;
};

const FINANCIAL_RECORD_COLUMNS =
  "id,surgery_id,attendance_type,expected_value,agreed_value,authorized_value,billed_value,received_value,glossed_value,adjusted_value,discount_value,payment_method,installments_count,due_date,notes";

export async function getOrCreateFinancialRecord(
  supabase: SupabaseClient,
  surgeryId: string,
  attendanceType: "particular" | "convenio"
): Promise<FinancialRecord> {
  const { data: existing, error: fetchError } = await supabase
    .from("financial_records")
    .select(FINANCIAL_RECORD_COLUMNS)
    .eq("surgery_id", surgeryId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) {
    // O tipo de atendimento da cirurgia pode ter mudado depois que o
    // registro foi criado (ex.: convênio -> particular). Sem acompanhar,
    // o registro ficava preso no tipo antigo e sumia da tela Financeiro.
    if ((existing as FinancialRecord).attendance_type !== attendanceType) {
      const { data: synced, error: syncError } = await supabase
        .from("financial_records")
        .update({ attendance_type: attendanceType })
        .eq("id", (existing as FinancialRecord).id)
        .select(FINANCIAL_RECORD_COLUMNS)
        .single();
      if (syncError) throw syncError;
      return synced as FinancialRecord;
    }
    return existing as FinancialRecord;
  }

  const { data: created, error: insertError } = await supabase
    .from("financial_records")
    .insert({ surgery_id: surgeryId, attendance_type: attendanceType })
    .select(FINANCIAL_RECORD_COLUMNS)
    .single();
  if (insertError) throw insertError;
  return created as FinancialRecord;
}

/** Só usada pelo fluxo de convênio, pra espelhar o valor recebido
 * informado no faturamento (insurance_billing.received_value) no registro
 * financeiro — é dali que o dashboard soma os totais. No fluxo particular
 * o received_value é somado automaticamente a partir das parcelas (ver
 * recordInstallmentPayment), nunca editado direto. */
export async function updateFinancialRecordReceivedValue(
  supabase: SupabaseClient,
  id: string,
  receivedValue: number
) {
  const { error } = await supabase
    .from("financial_records")
    .update({ received_value: receivedValue })
    .eq("id", id);
  if (error) throw error;
}

export async function updateFinancialRecord(
  supabase: SupabaseClient,
  id: string,
  input: Partial<
    Pick<
      FinancialRecord,
      | "expected_value"
      | "agreed_value"
      | "authorized_value"
      | "billed_value"
      | "discount_value"
      | "adjusted_value"
      | "payment_method"
      | "notes"
    >
  >
) {
  const { data, error } = await supabase
    .from("financial_records")
    .update(input)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  // O RLS do Supabase não devolve erro quando barra um UPDATE — só não
  // altera nada. Sem esta checagem, o app mostraria "salvo" sem ter salvo.
  if (!data || data.length === 0) throw new Error("Nenhuma linha foi atualizada (sem permissão ou registro inexistente).");
}

// ---------------------------------------------------------------------------
// Parcelas (particular)
// ---------------------------------------------------------------------------

export type Installment = {
  id: string;
  financial_record_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  received_amount: number;
  received_at: string | null;
  status: "open" | "partially_received" | "received" | "late" | "cancelled";
};

const INSTALLMENT_COLUMNS =
  "id,financial_record_id,installment_number,due_date,amount,received_amount,received_at,status";

export async function listInstallments(
  supabase: SupabaseClient,
  financialRecordId: string
): Promise<Installment[]> {
  const { data, error } = await supabase
    .from("receivable_installments")
    .select(INSTALLMENT_COLUMNS)
    .eq("financial_record_id", financialRecordId)
    .order("installment_number", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Installment[];
}

/** Gera as parcelas a partir do valor acordado, dividindo em partes iguais
 * (a última absorve o resto do arredondamento) com vencimento mensal a
 * partir da primeira data informada. Substitui qualquer parcela anterior
 * que ainda não tenha recebimento — para não perder histórico de valores
 * já recebidos, ao reemitir. */
export async function generateInstallments(
  supabase: SupabaseClient,
  financialRecordId: string,
  totalAmount: number,
  count: number,
  firstDueDate: string
) {
  const existing = await listInstallments(supabase, financialRecordId);
  const alreadyReceived = existing.filter((i) => i.received_amount > 0);
  if (alreadyReceived.length > 0) {
    throw new Error(
      "Já existem parcelas com valores recebidos — não é possível regenerar automaticamente."
    );
  }

  const { error: deleteError } = await supabase
    .from("receivable_installments")
    .delete()
    .eq("financial_record_id", financialRecordId);
  if (deleteError) throw deleteError;

  const cents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(cents / count);
  const remainderCents = cents - baseCents * count;

  const [year, month, day] = firstDueDate.split("-").map(Number);
  const rows = Array.from({ length: count }, (_, index) => {
    const dueDate = new Date(year, month - 1 + index, day);
    const amountCents = baseCents + (index === count - 1 ? remainderCents : 0);
    return {
      financial_record_id: financialRecordId,
      installment_number: index + 1,
      due_date: dueDate.toISOString().slice(0, 10),
      amount: amountCents / 100,
    };
  });

  const { error: insertError } = await supabase.from("receivable_installments").insert(rows);
  if (insertError) throw insertError;
}

/** Registra um recebimento (total ou parcial) numa parcela e recalcula o
 * status dela. Recebimentos acumulam — chamar de novo soma ao que já
 * tinha sido recebido antes. */
export async function recordInstallmentPayment(
  supabase: SupabaseClient,
  installmentId: string,
  amount: number,
  receivedAt: string
) {
  const { data: row, error: fetchError } = await supabase
    .from("receivable_installments")
    .select("id,financial_record_id,amount,received_amount")
    .eq("id", installmentId)
    .single();
  if (fetchError) throw fetchError;

  const newReceived = Math.min(row.amount, Number(row.received_amount) + amount);
  const status = newReceived >= row.amount ? "received" : newReceived > 0 ? "partially_received" : "open";

  const { data: updated, error: updateError } = await supabase
    .from("receivable_installments")
    .update({ received_amount: newReceived, received_at: receivedAt, status })
    .eq("id", installmentId)
    .select("id");
  if (updateError) throw updateError;
  if (!updated || updated.length === 0) throw new Error("Nenhuma linha foi atualizada (sem permissão ou registro inexistente).");

  // O dashboard financeiro soma received_value direto de financial_records
  // — pro particular, esse total é sempre a soma das parcelas, nunca
  // editado direto, então recalcula aqui a cada recebimento.
  const { data: installments, error: listError } = await supabase
    .from("receivable_installments")
    .select("received_amount")
    .eq("financial_record_id", row.financial_record_id);
  if (listError) throw listError;
  const total = (installments ?? []).reduce((sum, i) => sum + (Number(i.received_amount) || 0), 0);

  const { data: synced, error: syncError } = await supabase
    .from("financial_records")
    .update({ received_value: total })
    .eq("id", row.financial_record_id)
    .select("id");
  if (syncError) throw syncError;
  if (!synced || synced.length === 0) throw new Error("Nenhuma linha foi atualizada (sem permissão ou registro inexistente).");
}

export async function markInstallmentLate(supabase: SupabaseClient, installmentId: string) {
  const { error } = await supabase
    .from("receivable_installments")
    .update({ status: "late" })
    .eq("id", installmentId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Faturamento de convênio
// ---------------------------------------------------------------------------

export type InsuranceBilling = {
  id: string;
  financial_record_id: string;
  insurance_provider_id: string;
  tuss_code: string | null;
  guide_number: string | null;
  protocol_number: string | null;
  billed_at: string | null;
  expected_payment_date: string | null;
  received_at: string | null;
  received_value: number;
  notes: string | null;
};

const INSURANCE_BILLING_COLUMNS =
  "id,financial_record_id,insurance_provider_id,tuss_code,guide_number,protocol_number,billed_at,expected_payment_date,received_at,received_value,notes";

export async function getInsuranceBilling(
  supabase: SupabaseClient,
  financialRecordId: string
): Promise<InsuranceBilling | null> {
  const { data, error } = await supabase
    .from("insurance_billing")
    .select(INSURANCE_BILLING_COLUMNS)
    .eq("financial_record_id", financialRecordId)
    .maybeSingle();
  if (error) throw error;
  return data as InsuranceBilling | null;
}

export async function upsertInsuranceBilling(
  supabase: SupabaseClient,
  financialRecordId: string,
  insuranceProviderId: string,
  input: Partial<
    Pick<
      InsuranceBilling,
      "tuss_code" | "guide_number" | "protocol_number" | "billed_at" | "expected_payment_date" | "received_at" | "received_value" | "notes"
    >
  >
) {
  const existing = await getInsuranceBilling(supabase, financialRecordId);
  if (existing) {
    const { data, error } = await supabase
      .from("insurance_billing")
      .update(input)
      .eq("id", existing.id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Nenhuma linha foi atualizada (sem permissão ou registro inexistente).");
  } else {
    const { error } = await supabase.from("insurance_billing").insert({
      financial_record_id: financialRecordId,
      insurance_provider_id: insuranceProviderId,
      ...input,
    });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Glosas
// ---------------------------------------------------------------------------

export type Glosa = {
  id: string;
  financial_record_id: string;
  insurance_provider_id: string;
  guide_number: string | null;
  billed_value: number | null;
  glosa_value: number;
  reason: string | null;
  status: "identified" | "in_review" | "appeal_sent" | "awaiting_response" | "recovered" | "upheld" | "cancelled";
  glosa_date: string;
  appeal_date: string | null;
  justification: string | null;
  recovered_value: number | null;
  recovered_at: string | null;
};

const GLOSA_COLUMNS =
  "id,financial_record_id,insurance_provider_id,guide_number,billed_value,glosa_value,reason,status,glosa_date,appeal_date,justification,recovered_value,recovered_at";

export async function listGlosas(
  supabase: SupabaseClient,
  financialRecordId: string
): Promise<Glosa[]> {
  const { data, error } = await supabase
    .from("insurance_glosas")
    .select(GLOSA_COLUMNS)
    .eq("financial_record_id", financialRecordId)
    .order("glosa_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Glosa[];
}

/** financial_records.glossed_value não é preenchido automaticamente pelo
 * banco — mantém sincronizado aqui (soma de todas as glosas do registro)
 * pra entrar nos totais do dashboard. */
async function syncGlossedValue(supabase: SupabaseClient, financialRecordId: string) {
  const { data, error } = await supabase
    .from("insurance_glosas")
    .select("glosa_value")
    .eq("financial_record_id", financialRecordId);
  if (error) throw error;
  const total = (data ?? []).reduce((sum, g) => sum + (Number(g.glosa_value) || 0), 0);

  const { error: updateError } = await supabase
    .from("financial_records")
    .update({ glossed_value: total })
    .eq("id", financialRecordId);
  if (updateError) throw updateError;
}

export async function createGlosa(
  supabase: SupabaseClient,
  financialRecordId: string,
  insuranceProviderId: string,
  input: { guide_number?: string; billed_value?: number; glosa_value: number; reason?: string; glosa_date: string }
) {
  const { error } = await supabase.from("insurance_glosas").insert({
    financial_record_id: financialRecordId,
    insurance_provider_id: insuranceProviderId,
    ...input,
  });
  if (error) throw error;
  await syncGlossedValue(supabase, financialRecordId);
}

export async function updateGlosaStatus(
  supabase: SupabaseClient,
  glosaId: string,
  input: Partial<
    Pick<Glosa, "status" | "appeal_date" | "justification" | "recovered_value" | "recovered_at">
  >
) {
  const { data: row, error: fetchError } = await supabase
    .from("insurance_glosas")
    .select("financial_record_id")
    .eq("id", glosaId)
    .single();
  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from("insurance_glosas")
    .update(input)
    .eq("id", glosaId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("Nenhuma linha foi atualizada (sem permissão ou registro inexistente).");
  await syncGlossedValue(supabase, row.financial_record_id);
}

// ---------------------------------------------------------------------------
// Visão geral (dashboard /financial)
// ---------------------------------------------------------------------------

export type FinancialOverviewFilters = {
  attendance?: "particular" | "convenio";
  hospitalId?: string;
  from?: string;
  to?: string;
};

export type FinancialOverviewRow = {
  id: string;
  surgery_id: string;
  attendance_type: "particular" | "convenio";
  expected_value: number | null;
  agreed_value: number | null;
  billed_value: number | null;
  received_value: number;
  glossed_value: number;
  surgery: {
    code: string;
    confirmed_date: string | null;
    expected_date: string | null;
    hospital_id: string;
    patient: { full_name: string } | null;
    hospital: { name: string } | null;
  } | null;
};

export async function listFinancialOverview(
  supabase: SupabaseClient,
  filters: FinancialOverviewFilters
): Promise<FinancialOverviewRow[]> {
  let query = supabase
    .from("financial_records")
    .select(
      "id,surgery_id,attendance_type,expected_value,agreed_value,billed_value,received_value,glossed_value," +
        "surgery:surgeries(code,confirmed_date,expected_date,hospital_id,patient:patients(full_name),hospital:hospitals(name))"
    )
    .order("created_at", { ascending: false });

  if (filters.attendance) query = query.eq("attendance_type", filters.attendance);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as FinancialOverviewRow[];
  if (filters.hospitalId) {
    rows = rows.filter((r) => r.surgery?.hospital_id === filters.hospitalId);
  }
  return rows;
}

export type FinancialTotals = {
  expected: number;
  received: number;
  outstanding: number;
  glossed: number;
  openGlosasValue: number;
};

/** `attendance` restringe os totais a um tipo de atendimento — hoje o
 * dashboard sempre passa "particular" (convênio está fora de escopo por
 * ora: ver financial-panel.tsx); deixar o parâmetro opcional é só pra não
 * precisar mexer aqui de novo quando convênio voltar a ser calculado. */
export async function getFinancialTotals(
  supabase: SupabaseClient,
  attendance?: "particular" | "convenio"
): Promise<FinancialTotals> {
  let query = supabase
    .from("financial_records")
    .select("attendance_type,expected_value,agreed_value,billed_value,received_value,glossed_value");
  if (attendance) query = query.eq("attendance_type", attendance);
  const { data, error } = await query;
  if (error) throw error;

  let expected = 0;
  let received = 0;
  let glossed = 0;
  for (const row of data ?? []) {
    const base =
      row.attendance_type === "particular"
        ? row.agreed_value ?? row.expected_value ?? 0
        : row.billed_value ?? row.expected_value ?? 0;
    expected += Number(base) || 0;
    received += Number(row.received_value) || 0;
    glossed += Number(row.glossed_value) || 0;
  }

  // Glosa é exclusiva de convênio — não vale a pena consultar
  // insurance_glosas quando só particular está sendo somado.
  let openGlosasValue = 0;
  if (attendance !== "particular") {
    const { data: openGlosas, error: glosasError } = await supabase
      .from("insurance_glosas")
      .select("glosa_value,recovered_value,status")
      .not("status", "in", "(recovered,cancelled)");
    if (glosasError) throw glosasError;
    openGlosasValue = (openGlosas ?? []).reduce(
      (sum, g) => sum + (Number(g.glosa_value) || 0) - (Number(g.recovered_value) || 0),
      0
    );
  }

  return {
    expected,
    received,
    outstanding: Math.max(0, expected - received),
    glossed,
    openGlosasValue,
  };
}
