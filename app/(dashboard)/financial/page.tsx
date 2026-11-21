import { createClient } from "@/lib/supabase/server";
import { listFinancialOverview, getFinancialTotals, type FinancialOverviewFilters } from "@/lib/data/financial";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { FinancialFilters } from "@/components/financial/financial-filters";
import { FinancialOverviewTable } from "@/components/financial/financial-overview-table";

type SearchParams = {
  attendance?: string;
  hospital?: string;
};

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const filters: FinancialOverviewFilters = {
    attendance: params.attendance as FinancialOverviewFilters["attendance"],
    hospitalId: params.hospital,
  };

  const [totals, rows, hospitals] = await Promise.all([
    getFinancialTotals(supabase),
    listFinancialOverview(supabase, filters),
    listActiveHospitalsForSelect(supabase),
  ]);

  return (
    <div>
      <h1 className="text-lg font-medium text-foreground">Financeiro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Particulares e convênios — valores previstos, recebidos, glosas e saldo por cirurgia.
      </p>

      <div className="mt-4">
        <FinancialSummaryCards totals={totals} />
      </div>

      <div className="mt-4">
        <FinancialFilters hospitals={hospitals} />
      </div>

      <FinancialOverviewTable rows={rows} />
    </div>
  );
}
