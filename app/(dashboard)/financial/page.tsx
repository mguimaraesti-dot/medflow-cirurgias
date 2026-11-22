import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listFinancialOverview, getFinancialTotals, type FinancialOverviewFilters } from "@/lib/data/financial";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { FinancialFilters } from "@/components/financial/financial-filters";
import { FinancialOverviewTable } from "@/components/financial/financial-overview-table";

type SearchParams = {
  hospital?: string;
};

// Por enquanto o financeiro só cobre particular (ver financial-panel.tsx)
// — convênio fica fora dos totais e da lista até ser ativado.
const ATTENDANCE: FinancialOverviewFilters["attendance"] = "particular";

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireModuleView("financial");
  const params = await searchParams;
  const supabase = await createClient();

  const filters: FinancialOverviewFilters = {
    attendance: ATTENDANCE,
    hospitalId: params.hospital,
  };

  const [totals, rows, hospitals] = await Promise.all([
    getFinancialTotals(supabase, ATTENDANCE),
    listFinancialOverview(supabase, filters),
    listActiveHospitalsForSelect(supabase),
  ]);

  return (
    <div>
      <h1 className="text-lg font-medium text-foreground">Financeiro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Particulares — valor acordado, recebido e saldo por cirurgia.
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
