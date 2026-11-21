import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  listWorkflowStages,
  listSurgeriesForMap,
  getMapStats,
  type SurgeryMapFilters,
} from "@/lib/data/surgeries";
import { countOpenTasksBySurgery } from "@/lib/data/tasks";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { MapStatsRow } from "@/components/kanban/map-stats";
import { MapFilters } from "@/components/kanban/map-filters";
import { MapListTable } from "@/components/kanban/map-list-table";
import { ViewToggle } from "@/components/kanban/view-toggle";
import { Button } from "@/components/ui/button";

type SearchParams = {
  view?: string;
  q?: string;
  procedure?: string;
  hospital?: string;
  attendance?: string;
  priority?: string;
  status?: string;
  from?: string;
  to?: string;
  overdue?: string;
  pending?: string;
  scheduled?: string;
};

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const filters: SurgeryMapFilters = {
    q: params.q,
    procedureId: params.procedure,
    hospitalId: params.hospital,
    attendance: params.attendance,
    priority: params.priority,
    status: params.status,
    from: params.from,
    to: params.to,
    overdueOnly: params.overdue === "1",
    pendingRequirement: params.pending as SurgeryMapFilters["pendingRequirement"],
    scheduledOnly: params.scheduled === "1",
  };

  const [stages, surgeries, stats, openTasksBySurgery, hospitals, procedures, insuranceProviders] =
    await Promise.all([
      listWorkflowStages(supabase),
      listSurgeriesForMap(supabase, filters),
      getMapStats(supabase),
      countOpenTasksBySurgery(supabase),
      listActiveHospitalsForSelect(supabase),
      listActiveProceduresForSelect(supabase),
      listActiveInsuranceProvidersForSelect(supabase),
    ]);

  // O board só mostra cirurgias ativas (abaixo) — qualquer filtro de
  // situação diferente de "ativa" (ex: clicar no indicador "Realizadas")
  // não faria sentido nele, então cai automaticamente pra lista.
  const isListView = params.view === "lista" || (!!params.status && params.status !== "active");
  const activeSurgeries = surgeries.filter((s) => s.status === "active");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Mapa Cirúrgico</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe todo o ciclo da cirurgia, da indicação ao faturamento.
          </p>
        </div>
        <Link href="/surgeries/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nova cirurgia
          </Button>
        </Link>
      </div>

      <div className="mt-4">
        <MapStatsRow stats={stats} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <MapFilters
          procedures={procedures}
          hospitals={hospitals}
          insuranceProviders={insuranceProviders}
        />
        <ViewToggle />
      </div>

      <div className="mt-4">
        {isListView ? (
          <MapListTable surgeries={surgeries} openTasksBySurgery={openTasksBySurgery} />
        ) : activeSurgeries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma cirurgia ativa para esse filtro.
          </p>
        ) : (
          <KanbanBoard stages={stages} surgeries={activeSurgeries} openTasksBySurgery={openTasksBySurgery} />
        )}
      </div>
    </div>
  );
}
