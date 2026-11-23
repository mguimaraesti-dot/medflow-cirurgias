import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import {
  listFinancialOverview,
  financialBaseValue,
  financialPaymentStatus,
  type FinancialOverviewFilters,
  type FinancialPaymentStatus,
} from "@/lib/data/financial";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { FinancialSummaryCards } from "@/components/financial/financial-summary-cards";
import { FinancialFilters } from "@/components/financial/financial-filters";
import { FinancialOverviewTable } from "@/components/financial/financial-overview-table";

type SearchParams = {
  hospital?: string;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
};

const STATUSES: FinancialPaymentStatus[] = ["undefined", "open", "partial", "paid"];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

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
    q: params.q,
    status: STATUSES.find((s) => s === params.status),
    from: params.from && YMD.test(params.from) ? params.from : undefined,
    to: params.to && YMD.test(params.to) ? params.to : undefined,
  };

  const [rows, hospitals] = await Promise.all([
    listFinancialOverview(supabase, filters),
    listActiveHospitalsForSelect(supabase),
  ]);

  // Os totais acompanham os filtros aplicados (o que está na lista é o que soma).
  let expected = 0;
  let received = 0;
  let withoutValue = 0;
  for (const row of rows) {
    expected += financialBaseValue(row) ?? 0;
    received += Number(row.received_value) || 0;
    if (financialPaymentStatus(row) === "undefined") withoutValue += 1;
  }
  const totals = {
    expected,
    received,
    outstanding: Math.max(0, expected - received),
    count: rows.length,
    withoutValue,
  };

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
