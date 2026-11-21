import type { SupabaseClient } from "@supabase/supabase-js";

import { listFinancialOverview, type FinancialOverviewRow, type FinancialTotals } from "@/lib/data/financial";
import { listSurgeriesForReport, type ScheduleSurgeryItem } from "@/lib/data/surgeries";

export type ReportPeriod = { from: string; to: string };

export type SurgeriesReportFilters = ReportPeriod & { hospitalId?: string; status?: string };

export async function getSurgeriesReport(
  supabase: SupabaseClient,
  filters: SurgeriesReportFilters
): Promise<ScheduleSurgeryItem[]> {
  return listSurgeriesForReport(supabase, filters);
}

export type FinancialReportFilters = ReportPeriod & { hospitalId?: string };

export type FinancialReportResult = {
  rows: FinancialOverviewRow[];
  totals: FinancialTotals;
};

/**
 * Relatório financeiro (particular) por período. Filtra pela data
 * efetiva da cirurgia (confirmed_date, senão expected_date) — diferente
 * do filtro de /financial, que olha a data de criação do registro
 * financeiro. Busca tudo (particular) e filtra em memória, mesmo padrão
 * já usado em listFinancialOverview pro filtro de hospital.
 */
export async function getFinancialReport(
  supabase: SupabaseClient,
  filters: FinancialReportFilters
): Promise<FinancialReportResult> {
  const all = await listFinancialOverview(supabase, {
    attendance: "particular",
    hospitalId: filters.hospitalId,
  });

  const rows = all.filter((r) => {
    const effective = r.surgery?.confirmed_date ?? r.surgery?.expected_date ?? null;
    if (!effective) return false;
    return effective >= filters.from && effective <= filters.to;
  });

  const totals = rows.reduce(
    (acc, row) => {
      const expected = row.agreed_value ?? row.expected_value ?? 0;
      acc.expected += Number(expected) || 0;
      acc.received += Number(row.received_value) || 0;
      return acc;
    },
    { expected: 0, received: 0, outstanding: 0, glossed: 0, openGlosasValue: 0 } as FinancialTotals
  );
  totals.outstanding = totals.expected - totals.received;

  return { rows, totals };
}

export type ProductivityBucket = { month: string; label: string; count: number };

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Cirurgias realizadas por mês dentro do período informado — mesma ideia
 * de getCompletedSurgeriesByMonth (dashboard geral), mas com período
 * explícito em vez de "últimos N meses a partir de hoje". Agrupa por
 * confirmed_date (não existe "completed_at" separado no schema).
 */
export async function getProductivityReport(
  supabase: SupabaseClient,
  filters: ReportPeriod
): Promise<ProductivityBucket[]> {
  const fromDate = new Date(filters.from + "T00:00:00");
  const toDate = new Date(filters.to + "T00:00:00");

  const buckets: ProductivityBucket[] = [];
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  // Limite de segurança: nunca monta mais de 60 baldes (5 anos), mesmo
  // que o período pedido seja muito largo.
  let guard = 0;
  while (cursor <= end && guard < 60) {
    buckets.push({
      month: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_LABELS[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
      count: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
    guard += 1;
  }
  const indexByMonth = new Map(buckets.map((b, idx) => [b.month, idx]));

  const { data, error } = await supabase
    .from("surgeries")
    .select("confirmed_date")
    .eq("status", "completed")
    .gte("confirmed_date", filters.from)
    .lte("confirmed_date", filters.to);
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.confirmed_date) continue;
    const idx = indexByMonth.get(row.confirmed_date.slice(0, 7));
    if (idx !== undefined) buckets[idx].count += 1;
  }

  return buckets;
}
