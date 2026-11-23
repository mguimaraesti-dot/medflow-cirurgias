import { cache, Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import {
  getDashboardOverview,
  getNextSevenDays,
  resolveDashboardRange,
  type DashboardAttendance,
  type DashboardFilters,
} from "@/lib/data/dashboard";
import { getAttentionItems } from "@/lib/data/dashboard-attention";
import { getFinancePanel, getPerformance, type FinanceMode } from "@/lib/data/dashboard-performance";
import { AttentionList } from "@/components/dashboard/attention-list";
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters-bar";
import { AgendaPanel, FinancePanel, KpiGrid, PanelError, PanelSkeleton } from "@/components/dashboard/dashboard-panels";
import { PerformanceChart } from "@/components/dashboard/performance-chart";

type SearchParams = { p?: string; from?: string; to?: string; hospital?: string; att?: string; perf?: string; fin?: string };

// Evita consultar a Central de atenção duas vezes (cards + painel) na mesma requisição.
const loadAttention = cache(async (hospitalId: string | undefined, attendance: DashboardAttendance | undefined, includeTasks: boolean) => {
  const supabase = await createClient();
  return getAttentionItems(supabase, { hospitalId, attendance }, { includeTasks });
});

// Os indicadores e o painel de fluxo usam o mesmo cálculo — uma consulta só por requisição.
const loadOverview = cache(
  async (from: string, to: string, hospitalId: string | undefined, attendance: DashboardAttendance | undefined, includeTasks: boolean) => {
    const supabase = await createClient();
    const attention = await loadAttention(hospitalId, attendance, includeTasks);
    return getDashboardOverview(supabase, { from, to, hospitalId, attendance }, attention.filter((i) => i.level === "critical").length);
  }
);

function qs(params: SearchParams, changes: Partial<SearchParams>) {
  const merged = { ...params, ...changes } as Record<string, string | undefined>;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) usp.set(k, v);
  const s = usp.toString();
  return `/dashboard${s ? `?${s}` : ""}`;
}

async function OverviewSection({ filters, includeTasks }: { filters: DashboardFilters; includeTasks: boolean }) {
  let overview;
  try {
    overview = await loadOverview(filters.from, filters.to, filters.hospitalId, filters.attendance, includeTasks);
  } catch (e) {
    console.error("[dashboard] indicadores:", e);
    return <PanelError title="indicadores" />;
  }
  return <KpiGrid overview={overview} filters={filters} />;
}

async function AttentionSection({ filters, includeTasks }: { filters: DashboardFilters; includeTasks: boolean }) {
  let items;
  try {
    items = await loadAttention(filters.hospitalId, filters.attendance, includeTasks);
  } catch (e) {
    console.error("[dashboard] central de atenção:", e);
    return <PanelError title="central de atenção" />;
  }
  return <AttentionList items={items} />;
}

async function AgendaSection({ filters }: { filters: DashboardFilters }) {
  let surgeries;
  try {
    const supabase = await createClient();
    surgeries = await getNextSevenDays(supabase, filters);
  } catch (e) {
    console.error("[dashboard] agenda:", e);
    return <PanelError title="agenda dos próximos 7 dias" />;
  }
  return <AgendaPanel surgeries={surgeries} />;
}

async function PerformanceSection({ filters, months, params }: { filters: DashboardFilters; months: 6 | 12; params: SearchParams }) {
  let data;
  try {
    const supabase = await createClient();
    data = await getPerformance(supabase, filters, months);
  } catch (e) {
    console.error("[dashboard] desempenho:", e);
    return <PanelError title="desempenho cirúrgico" />;
  }
  return <PerformanceChart data={data} monthsBack={months} hrefs={{ 6: qs(params, { perf: undefined }), 12: qs(params, { perf: "12" }) }} />;
}

async function FinanceSection({ filters, mode, params }: { filters: DashboardFilters; mode: FinanceMode; params: SearchParams }) {
  let data;
  try {
    const supabase = await createClient();
    data = await getFinancePanel(supabase, filters, mode);
  } catch (e) {
    console.error("[dashboard] financeiro:", e);
    return <PanelError title="painel financeiro" />;
  }
  return <FinancePanel data={data} hrefs={{ particular: qs(params, { fin: "particular" }), convenio: qs(params, { fin: "convenio" }) }} />;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireModuleView("dashboard");
  const params = await searchParams;
  const user = await getCurrentUser();
  const [canFinance, canTasks] = user
    ? await Promise.all([hasPermission(user, "financial", "view"), hasPermission(user, "pending_tasks", "view")])
    : [false, false];

  const supabase = await createClient();
  const hospitals = await listActiveHospitalsForSelect(supabase);
  const range = resolveDashboardRange(params);
  const attendance = params.att === "particular" || params.att === "convenio" ? params.att : undefined;
  const hospitalId = hospitals.some((h) => h.id === params.hospital) ? params.hospital : undefined;
  const filters: DashboardFilters = { from: range.from, to: range.to, hospitalId, attendance };
  const months: 6 | 12 = params.perf === "12" ? 12 : 6;
  const financeMode: FinanceMode = params.fin === "convenio" || params.fin === "particular" ? params.fin : (attendance ?? "particular");
  const key = JSON.stringify([filters, months, financeMode]);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visão operacional e financeira das cirurgias · {range.from.split("-").reverse().join("/")} a {range.to.split("-").reverse().join("/")}
          </p>
        </div>
        <div className="w-full lg:w-auto">
          <DashboardFiltersBar hospitals={hospitals} preset={range.preset} from={range.from} to={range.to} />
        </div>
      </div>

      <div className="shrink-0">
        <Suspense key={`k-${key}`} fallback={<PanelSkeleton className="h-28" />}>
          <OverviewSection filters={filters} includeTasks={canTasks} />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 [&>*]:min-h-0">
        <Suspense key={`a-${key}`} fallback={<PanelSkeleton className="h-72" />}>
          <AttentionSection filters={filters} includeTasks={canTasks} />
        </Suspense>
        <Suspense key={`g-${key}`} fallback={<PanelSkeleton className="h-72" />}>
          <AgendaSection filters={filters} />
        </Suspense>
      </div>

      <div className={canFinance ? "grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 [&>*]:min-h-0" : "lg:min-h-0 lg:flex-1"}>
        <Suspense key={`p-${key}`} fallback={<PanelSkeleton className="h-80" />}>
          <PerformanceSection filters={filters} months={months} params={params} />
        </Suspense>
        {canFinance ? (
          <Suspense key={`$-${key}`} fallback={<PanelSkeleton className="h-80" />}>
            <FinanceSection filters={filters} mode={financeMode} params={params} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
