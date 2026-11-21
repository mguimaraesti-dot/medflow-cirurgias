import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getMapStats, listUpcomingSurgeries } from "@/lib/data/surgeries";
import { countOpenTasks } from "@/lib/data/tasks";
import { getFinancialReport, getProductivityReport } from "@/lib/data/reports";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { DashboardPeriodFilter } from "@/components/dashboard/dashboard-period-filter";
import { UpcomingSurgeriesList } from "@/components/dashboard/upcoming-surgeries-list";
import { CompletedByMonthChart } from "@/components/dashboard/completed-by-month-chart";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";

type SearchParams = {
  from?: string;
  to?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateLabel(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireModuleView("dashboard");
  const params = await searchParams;
  const supabase = await createClient();

  // Sem período na URL (primeira visita), financeiro e gráfico cobrem os
  // últimos 6 meses — era o comportamento fixo do Dashboard antes do
  // filtro existir, então vira só o padrão agora.
  const today = new Date();
  const defaultFrom = toISODate(new Date(today.getFullYear(), today.getMonth() - 5, 1));
  const defaultTo = toISODate(today);
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  const [mapStats, openTasks, financialReport, upcomingSurgeries, completedByMonth] = await Promise.all([
    getMapStats(supabase),
    countOpenTasks(supabase),
    getFinancialReport(supabase, { from, to }),
    listUpcomingSurgeries(supabase, 6),
    getProductivityReport(supabase, { from, to }),
  ]);

  const kpis = [
    { label: "Cirurgias ativas", value: mapStats.inProgress, href: "/kanban", dotClassName: "bg-blue-500" },
    { label: "Confirmadas", value: mapStats.scheduled, href: "/schedule?status=confirmada", dotClassName: "bg-emerald-500" },
    { label: "Atrasadas", value: mapStats.overdue, href: "/schedule?status=atrasada", dotClassName: "bg-red-500" },
    {
      label: "Aguardando autorização",
      value: mapStats.awaitingAuthorization,
      href: "/kanban?pending=authorization",
      dotClassName: "bg-amber-500",
    },
    { label: "Tarefas abertas", value: openTasks, href: "/pending-tasks", dotClassName: "bg-muted-foreground" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Indicadores operacionais e financeiros gerais.</p>
        </div>
        <DashboardPeriodFilter />
      </div>

      <div className="mt-4">
        <DashboardKpiCards kpis={kpis} />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Financeiro (particular) — {formatDateLabel(from)} até {formatDateLabel(to)}
        </h2>
        <FinancialSummaryCards totals={financialReport.totals} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingSurgeriesList surgeries={upcomingSurgeries} />
        <CompletedByMonthChart data={completedByMonth} />
      </div>
    </div>
  );
}
