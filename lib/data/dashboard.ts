import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAll } from "@/lib/data/fetch-all";
import {
  effectiveDateOr,
  listSurgeriesForSchedule,
  listWorkflowStages,
  type ScheduleSurgeryItem,
  type WorkflowStage,
} from "@/lib/data/surgeries";
import { todayInSaoPaulo } from "@/lib/utils";

export type DashboardAttendance = "particular" | "convenio";

export type DashboardFilters = {
  from: string;
  to: string;
  hospitalId?: string;
  attendance?: DashboardAttendance;
};

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
}

export type DashboardPreset = "year" | "7d" | "30d" | "90d" | "6m" | "custom";

/** Resolve o período a partir dos parâmetros da URL (padrão: ano vigente, 1º/jan a 31/dez). */
export function resolveDashboardRange(params: { p?: string; from?: string; to?: string }): {
  preset: DashboardPreset;
  from: string;
  to: string;
} {
  const today = todayInSaoPaulo();
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  if (params.p === "custom" && params.from && params.to && ISO.test(params.from) && ISO.test(params.to) && params.from <= params.to) {
    return { preset: "custom", from: params.from, to: params.to };
  }
  const span: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "6m": 182 };
  if (!params.p || !span[params.p]) {
    const year = today.slice(0, 4);
    return { preset: "year", from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const preset = params.p as Exclude<DashboardPreset, "custom" | "year">;
  return { preset, from: addDaysISO(today, -(span[preset] - 1)), to: today };
}

type Row = {
  id: string;
  status: string;
  stage_id: string;
  expected_date: string | null;
  confirmed_date: string | null;
  indication_date: string;
  attendance_type: string;
  hospital_id: string | null;
};

async function fetchRows(supabase: SupabaseClient, f: DashboardFilters, from: string, to: string): Promise<Row[]> {
  return fetchAll<Row>((a, b) => {
    let q = supabase
      .from("surgeries")
      .select("id,status,stage_id,expected_date,confirmed_date,indication_date,attendance_type,hospital_id")
      .or(effectiveDateOr(from, to))
      .range(a, b);
    if (f.hospitalId) q = q.eq("hospital_id", f.hospitalId);
    if (f.attendance) q = q.eq("attendance_type", f.attendance);
    return q;
  });
}

export type KpiKey = "total" | "confirmed" | "awaiting" | "critical" | "completed" | "cancelled";

export type KpiValue = {
  key: KpiKey;
  value: number;
  /** variação % sobre o período anterior; nulo quando não há base comparável */
  delta: number | null;
  /** o que significa "bom" para a variação */
  upIsGood: boolean | null;
};

function pct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export type DashboardOverview = {
  kpis: KpiValue[];
  flow: { stage: WorkflowStage; count: number }[];
  previousFrom: string;
  previousTo: string;
};

export async function getDashboardOverview(
  supabase: SupabaseClient,
  f: DashboardFilters,
  criticalCount: number
): Promise<DashboardOverview> {
  const len = daysBetween(f.from, f.to) + 1;
  const previousTo = addDaysISO(f.from, -1);
  const previousFrom = addDaysISO(previousTo, -(len - 1));

  const [current, previous, stages] = await Promise.all([
    fetchRows(supabase, f, f.from, f.to),
    fetchRows(supabase, f, previousFrom, previousTo),
    listWorkflowStages(supabase),
  ]);

  const confirmed = (rows: Row[]) => rows.filter((r) => r.status === "active" && r.confirmed_date).length;
  const byStatus = (rows: Row[], s: string) => rows.filter((r) => r.status === s).length;

  // Aguardando autorização: mesma definição do Mapa (ativa + requisito de autorização pendente).
  const activeIds = current.filter((r) => r.status === "active").map((r) => r.id);
  let awaiting = 0;
  for (let i = 0; i < activeIds.length; i += 100) {
    const { data, error } = await supabase
      .from("surgery_requirements")
      .select("surgery_id")
      .in("surgery_id", activeIds.slice(i, i + 100))
      .eq("requirement_key", "authorization")
      .eq("is_satisfied", false)
      .eq("waived", false);
    if (error) throw error;
    awaiting += (data ?? []).length;
  }

  const kpis: KpiValue[] = [
    { key: "total", value: current.length, delta: pct(current.length, previous.length), upIsGood: null },
    { key: "confirmed", value: confirmed(current), delta: pct(confirmed(current), confirmed(previous)), upIsGood: true },
    { key: "awaiting", value: awaiting, delta: null, upIsGood: false },
    { key: "critical", value: criticalCount, delta: null, upIsGood: false },
    { key: "completed", value: byStatus(current, "completed"), delta: pct(byStatus(current, "completed"), byStatus(previous, "completed")), upIsGood: true },
    { key: "cancelled", value: byStatus(current, "cancelled"), delta: pct(byStatus(current, "cancelled"), byStatus(previous, "cancelled")), upIsGood: false },
  ];

  // Fluxo: cirurgias do período (ativas ou realizadas) por etapa real do sistema.
  const counts = new Map<string, number>();
  for (const r of current) {
    if (r.status !== "active" && r.status !== "completed") continue;
    counts.set(r.stage_id, (counts.get(r.stage_id) ?? 0) + 1);
  }
  const flow = stages.map((stage) => ({ stage, count: counts.get(stage.id) ?? 0 }));

  return { kpis, flow, previousFrom, previousTo };
}

/** Cirurgias dos próximos 7 dias (hoje + 6), ativas ou reagendadas, respeitando hospital e atendimento. */
export async function getNextSevenDays(supabase: SupabaseClient, f: Pick<DashboardFilters, "hospitalId" | "attendance">): Promise<ScheduleSurgeryItem[]> {
  const today = todayInSaoPaulo();
  const rows = await listSurgeriesForSchedule(supabase, { from: today, to: addDaysISO(today, 6), hospitalId: f.hospitalId });
  return rows
    .filter((s) => s.status === "active" || s.status === "rescheduled")
    .filter((s) => !f.attendance || s.attendance_type === f.attendance)
    .sort((a, b) => {
      const da = `${a.confirmed_date ?? a.expected_date ?? ""} ${a.confirmed_time ?? "99:99"}`;
      const db = `${b.confirmed_date ?? b.expected_date ?? ""} ${b.confirmed_time ?? "99:99"}`;
      return da.localeCompare(db);
    });
}
