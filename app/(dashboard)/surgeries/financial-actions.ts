"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  updateFinancialRecord,
  updateFinancialRecordReceivedValue,
  generateInstallments,
  recordInstallmentPayment,
  listInstallments,
  upsertInsuranceBilling,
  createGlosa,
  updateGlosaStatus,
} from "@/lib/data/financial";
import {
  convenioValuesSchema,
  generateInstallmentsSchema,
  installmentPaymentSchema,
  insuranceBillingSchema,
  createGlosaSchema,
  glosaAppealSchema,
  glosaResolveSchema,
} from "@/lib/validation/financial";

export type FinancialActionState = { error?: string };

const genericError: FinancialActionState = { error: "Não foi possível salvar. Tente novamente." };
const forbiddenError: FinancialActionState = { error: "Você não tem permissão para esta ação." };

export async function saveConvenioValuesAction(
  surgeryId: string,
  financialRecordId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = convenioValuesSchema.safeParse({
    expected_value: formData.get("expected_value"),
    authorized_value: formData.get("authorized_value"),
    discount_value: formData.get("discount_value"),
    adjusted_value: formData.get("adjusted_value"),
    payment_method: formData.get("payment_method"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await updateFinancialRecord(supabase, financialRecordId, parsed.data);
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

/** Atalho pro caso comum (pagamento à vista, sem parcelamento): confirma o
 * recebimento num clique só, sem precisar passar por "Gerar parcelas"
 * manualmente antes. Por baixo ainda usa o mesmo mecanismo de parcela
 * (cria uma parcela única na primeira vez que é chamada, se ainda não
 * existir nenhuma) — assim o saldo/recebido continua vindo de uma única
 * fonte de verdade (receivable_installments), só a UI é que esconde esse
 * passo intermediário pra quem nunca parcela. */
export async function confirmSinglePaymentAction(
  surgeryId: string,
  financialRecordId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = installmentPaymentSchema.safeParse({
    amount: formData.get("amount"),
    received_at: formData.get("received_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    const existing = await listInstallments(supabase, financialRecordId);
    if (existing.length === 0) {
      await generateInstallments(supabase, financialRecordId, parsed.data.amount, 1, parsed.data.received_at);
    }
    const installments = await listInstallments(supabase, financialRecordId);
    const target = installments[0];
    if (!target) return genericError;
    await recordInstallmentPayment(supabase, target.id, parsed.data.amount, parsed.data.received_at);
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function generateInstallmentsAction(
  surgeryId: string,
  financialRecordId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = generateInstallmentsSchema.safeParse({
    total_amount: formData.get("total_amount"),
    count: formData.get("count"),
    first_due_date: formData.get("first_due_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await generateInstallments(
      supabase,
      financialRecordId,
      parsed.data.total_amount,
      parsed.data.count,
      parsed.data.first_due_date
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Não foi possível gerar as parcelas." };
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function recordInstallmentPaymentAction(
  surgeryId: string,
  installmentId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = installmentPaymentSchema.safeParse({
    amount: formData.get("amount"),
    received_at: formData.get("received_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await recordInstallmentPayment(supabase, installmentId, parsed.data.amount, parsed.data.received_at);
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function saveInsuranceBillingAction(
  surgeryId: string,
  financialRecordId: string,
  insuranceProviderId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = insuranceBillingSchema.safeParse({
    tuss_code: formData.get("tuss_code"),
    guide_number: formData.get("guide_number"),
    protocol_number: formData.get("protocol_number"),
    billed_at: formData.get("billed_at"),
    expected_payment_date: formData.get("expected_payment_date"),
    received_at: formData.get("received_at"),
    received_value: formData.get("received_value"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Dados inválidos." };
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await upsertInsuranceBilling(supabase, financialRecordId, insuranceProviderId, parsed.data);
    // O dashboard financeiro soma received_value direto de financial_records
    // (não de insurance_billing) — como hoje só existe uma guia por
    // cirurgia, espelha o valor recebido do faturamento pro registro
    // financeiro pra entrar nos totais.
    if (parsed.data.received_value !== undefined) {
      await updateFinancialRecordReceivedValue(supabase, financialRecordId, parsed.data.received_value);
    }
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function createGlosaAction(
  surgeryId: string,
  financialRecordId: string,
  insuranceProviderId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = createGlosaSchema.safeParse({
    guide_number: formData.get("guide_number"),
    billed_value: formData.get("billed_value"),
    glosa_value: formData.get("glosa_value"),
    reason: formData.get("reason"),
    glosa_date: formData.get("glosa_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await createGlosa(supabase, financialRecordId, insuranceProviderId, parsed.data);
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function sendGlosaAppealAction(
  surgeryId: string,
  glosaId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = glosaAppealSchema.safeParse({
    appeal_date: formData.get("appeal_date"),
    justification: formData.get("justification"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await updateGlosaStatus(supabase, glosaId, { status: "appeal_sent", ...parsed.data });
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function resolveGlosaAction(
  surgeryId: string,
  glosaId: string,
  _prevState: FinancialActionState,
  formData: FormData
): Promise<FinancialActionState> {
  const parsed = glosaResolveSchema.safeParse({
    status: formData.get("status"),
    recovered_value: formData.get("recovered_value"),
    recovered_at: formData.get("recovered_at"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return forbiddenError;
  }

  const supabase = await createClient();
  try {
    await updateGlosaStatus(supabase, glosaId, parsed.data);
  } catch {
    return genericError;
  }
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}
