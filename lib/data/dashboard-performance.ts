import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAll } from "@/lib/data/fetch-all";
import { addDaysISO, type DashboardFilters } from "@/lib/data/dashboard";
import { todayInSaoPaulo } from "@/lib/utils";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type PerformanceMonth = { ym: string; label: string; previstas: number; realizadas: number; canceladas: number };

export type PerformanceData = {
  months: PerformanceMonth[];
  totals: { previstas: number; realizadas: number; canceladas: number };
  /** taxas sobre o total programado no período; nulas sem base */
  completionRate: number | null;
  cancellationRate: number | null;
  /** variação de realizadas do último mês sobre o anterior (mês anterior > 0) */
  evolution: number | null;
};

/**
 * Desempenho mensal. Cada cirurgia entra em UM único mês, pela data efetiva
 * (confirmada, senão prevista; sem data não entra). "Previstas" = todas as
 * programadas no mês; "Realizadas" e "Canceladas" são subconjuntos dela, pelo
 * status atual — assim nenhuma cirurgia é contada duas vezes.
 */
export async function getPerformance(
  supabase: SupabaseClient,
  f: Pick<DashboardFilters, "hospitalId" | "attendance">,
  monthsBack: 6 | 12
): Promise<PerformanceData> {
  const today = todayInSaoPaulo();
  const [y, m] = today.split("-").map(Number);
  const months: PerformanceMonth[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push({
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      previstas: 0,
      realizadas: 0,
      canceladas: 0,
    });
  }
  const from = `${months[0].ym}-01`;
  const last = months[months.length - 1].ym;
  const [ly, lm] = last.split("-").map(Number);
  const to = addDaysISO(`${new Date(ly, lm, 1).toLocaleDateString("en-CA")}`, -1);

  const rows = await fetchAll<{ status: string; confirmed_date: string | null; expected_date: string | null }>((a, b) => {
    let q = supabase
      .from("surgeries")
      .select("status,confirmed_date,expected_date")
      .or(
        `and(confirmed_date.gte.${from},confirmed_date.lte.${to}),` +
          `and(confirmed_date.is.null,expected_date.gte.${from},expected_date.lte.${to})`
      )
      .range(a, b);
    if (f.hospitalId) q = q.eq("hospital_id", f.hospitalId);
    if (f.attendance) q = q.eq("attendance_type", f.attendance);
    return q;
  });

  const index = new Map(months.map((mo, i) => [mo.ym, i]));
  for (const r of rows) {
    const date = r.confirmed_date ?? r.expected_date;
    const i = date ? index.get(date.slice(0, 7)) : undefined;
    if (i === undefined) continue;
    months[i].previstas += 1;
    if (r.status === "completed") months[i].realizadas += 1;
    if (r.status === "cancelled") months[i].canceladas += 1;
  }

  const totals = months.reduce(
    (acc, mo) => ({ previstas: acc.previstas + mo.previstas, realizadas: acc.realizadas + mo.realizadas, canceladas: acc.canceladas + mo.canceladas }),
    { previstas: 0, realizadas: 0, canceladas: 0 }
  );
  const lastTwo = months.slice(-2);
  const evolution =
    lastTwo.length === 2 && lastTwo[0].realizadas > 0
      ? Math.round(((lastTwo[1].realizadas - lastTwo[0].realizadas) / lastTwo[0].realizadas) * 100)
      : null;
  return {
    months,
    totals,
    completionRate: totals.previstas > 0 ? Math.round((totals.realizadas / totals.previstas) * 100) : null,
    cancellationRate: totals.previstas > 0 ? Math.round((totals.canceladas / totals.previstas) * 100) : null,
    evolution,
  };
}

export type FinanceMode = "particular" | "convenio";

export type FinancePanelData = {
  mode: FinanceMode;
  records: number;
  expected: number;
  received: number;
  outstanding: number;
  overdue: number;
  percentReceived: number | null;
};

/**
 * Painel financeiro, só com valores dos registros financeiros existentes
 * (nada previsto é contado como recebido). Particular: acordado/previsto,
 * recebido e parcelas vencidas. Convênio: faturado/previsto e recebido; vence
 * quando há data prevista de pagamento já passada e saldo pendente.
 */
export async function getFinancePanel(
  supabase: SupabaseClient,
  f: DashboardFilters,
  mode: FinanceMode
): Promise<FinancePanelData> {
  const today = todayInSaoPaulo();
  type Rec = {
    id: string;
    expected_value: number | null;
    agreed_value: number | null;
    billed_value: number | null;
    received_value: number | null;
    surgery: { confirmed_date: string | null; expected_date: string | null; hospital_id: string | null } | null;
  };
  const all = await fetchAll<Rec>((a, b) =>
    supabase
      .from("financial_records")
      .select("id,expected_value,agreed_value,billed_value,received_value,surgery:surgeries(confirmed_date,expected_date,hospital_id)")
      .eq("attendance_type", mode)
      .range(a, b)
  );
  const recs = all.filter((r) => {
    const d = r.surgery?.confirmed_date ?? r.surgery?.expected_date ?? null;
    if (!d || d < f.from || d > f.to) return false;
    return !f.hospitalId || r.surgery?.hospital_id === f.hospitalId;
  });

  const previsto = (r: Rec) => Number((mode === "particular" ? (r.agreed_value ?? r.expected_value) : (r.billed_value ?? r.expected_value)) ?? 0) || 0;
  let expected = 0;
  let received = 0;
  let outstanding = 0;
  for (const r of recs) {
    expected += previsto(r);
    const rec = Number(r.received_value) || 0;
    received += rec;
    outstanding += Math.max(0, previsto(r) - rec);
  }

  let overdue = 0;
  const ids = recs.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const part = ids.slice(i, i + 100);
    if (mode === "particular") {
      const { data, error } = await supabase
        .from("receivable_installments")
        .select("amount,received_amount,status,due_date")
        .in("financial_record_id", part)
        .lt("due_date", today)
        .in("status", ["open", "partially_received", "late"]);
      if (error) throw error;
      for (const p of data ?? []) overdue += Math.max(0, (Number(p.amount) || 0) - (Number(p.received_amount) || 0));
    } else {
      const { data, error } = await supabase
        .from("insurance_billing")
        .select("financial_record_id,expected_payment_date,received_at")
        .in("financial_record_id", part)
        .lt("expected_payment_date", today)
        .is("received_at", null);
      if (error) throw error;
      const late = new Set((data ?? []).map((b) => b.financial_record_id));
      for (const r of recs) if (late.has(r.id)) overdue += Math.max(0, previsto(r) - (Number(r.received_value) || 0));
    }
  }

  return {
    mode,
    records: recs.length,
    expected,
    received,
    outstanding,
    overdue,
    percentReceived: expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : null,
  };
}
