import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { getSurgeriesReport, getFinancialReport, getProductivityReport } from "@/lib/data/reports";
import { WhatsappScheduleDialog } from "@/components/reports/whatsapp-schedule-dialog";
import { ReportFilters } from "@/components/reports/report-filters";
import { SurgeriesReportTable } from "@/components/reports/surgeries-report-table";
import { FinancialOverviewTable } from "@/components/financial/financial-overview-table";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { CompletedByMonthChart } from "@/components/dashboard/completed-by-month-chart";

type ReportType = "cirurgias" | "financeiro" | "produtividade";

type SearchParams = {
  type?: string;
  from?: string;
  to?: string;
  hospital?: string;
  status?: string;
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

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireModuleView("reports");
  const params = await searchParams;
  const supabase = await createClient();

  const type: ReportType =
    params.type === "financeiro" || params.type === "produtividade" ? params.type : "cirurgias";

  // Sem período na URL (primeira visita), relatório parte do mês atual —
  // o filtro de período (ReportFilters) sempre tem um atalho selecionado
  // depois disso, nunca fica "sem período".
  const today = new Date();
  const defaultFrom = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultTo = toISODate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  const hospitals = await listActiveHospitalsForSelect(supabase);

  let body: React.ReactNode;
  if (type === "financeiro") {
    const { rows, totals } = await getFinancialReport(supabase, { from, to, hospitalId: params.hospital });
    body = (
      <div className="mt-4 space-y-4">
        <FinancialSummaryCards totals={totals} />
        <FinancialOverviewTable rows={rows} />
      </div>
    );
  } else if (type === "produtividade") {
    const buckets = await getProductivityReport(supabase, { from, to });
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    body = (
      <div className="mt-4 space-y-3">
        <CompletedByMonthChart data={buckets} />
        <p className="text-sm text-muted-foreground">
          Total no período: {total} cirurgia{total === 1 ? "" : "s"} realizada{total === 1 ? "" : "s"}.
        </p>
      </div>
    );
  } else {
    const rows = await getSurgeriesReport(supabase, {
      from,
      to,
      hospitalId: params.hospital,
      status: params.status,
    });
    body = <SurgeriesReportTable rows={rows} />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-lg font-medium text-foreground">Relatórios</h1>
        <div className="print:hidden">
          <WhatsappScheduleDialog />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cirurgias, financeiro (particular) e produtividade por período, com exportação em CSV.
      </p>

      <div className="mt-4 print:hidden">
        <ReportFilters hospitals={hospitals} />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Período: {formatDateLabel(from)} até {formatDateLabel(to)}
      </p>

      {body}
    </div>
  );
}
