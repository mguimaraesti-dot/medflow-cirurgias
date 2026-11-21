import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getMapStats, listUpcomingSurgeries, getCompletedSurgeriesByMonth } from "@/lib/data/surgeries";
import { countOpenTasks } from "@/lib/data/tasks";
import { getFinancialTotals } from "@/lib/data/financial";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { UpcomingSurgeriesList } from "@/components/dashboard/upcoming-surgeries-list";
import { CompletedByMonthChart } from "@/components/dashboard/completed-by-month-chart";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";

export default async function DashboardPage() {
  await requireModuleView("dashboard");
  const supabase = await createClient();

  const [mapStats, openTasks, financialTotals, upcomingSurgeries, completedByMonth] = await Promise.all([
    getMapStats(supabase),
    countOpenTasks(supabase),
    getFinancialTotals(supabase, "particular"),
    listUpcomingSurgeries(supabase, 6),
    getCompletedSurgeriesByMonth(supabase, 6),
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
    {
      label: "Pendência de materiais",
      value: mapStats.materialsPending,
      href: "/kanban?pending=materials",
      dotClassName: "bg-amber-500",
    },
    { label: "Tarefas abertas", value: openTasks, href: "/pending-tasks", dotClassName: "bg-muted-foreground" },
  ];

  return (
    <div>
      <h1 className="text-lg font-medium text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Indicadores operacionais e financeiros gerais.</p>

      <div className="mt-4">
        <DashboardKpiCards kpis={kpis} />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Financeiro (particular)
        </h2>
        <FinancialSummaryCards totals={financialTotals} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <UpcomingSurgeriesList surgeries={upcomingSurgeries} />
        <CompletedByMonthChart data={completedByMonth} />
      </div>
    </div>
  );
}
