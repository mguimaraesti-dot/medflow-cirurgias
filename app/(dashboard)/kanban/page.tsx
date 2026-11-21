import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import {
  listWorkflowStages,
  listSurgeriesForMap,
  getMapStats,
  type SurgeryMapFilters,
} from "@/lib/data/surgeries";
import { countOpenTasksBySurgery } from "@/lib/data/tasks";
import { countSurgeryDocumentsBySurgery } from "@/lib/data/surgery-documents";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { MapStatsRow } from "@/components/kanban/map-stats";
import { MapFilters, ClearFiltersButton } from "@/components/kanban/map-filters";
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
  await requireModuleView("kanban");
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

  const [
    stages,
    surgeries,
    stats,
    openTasksBySurgery,
    documentsBySurgery,
    hospitals,
    procedures,
    insuranceProviders,
  ] = await Promise.all([
    listWorkflowStages(supabase),
    listSurgeriesForMap(supabase, filters),
    getMapStats(supabase),
    countOpenTasksBySurgery(supabase),
    countSurgeryDocumentsBySurgery(supabase),
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
      {/*
        No mobile o botão fica ACIMA dos indicadores (flex-col-reverse: a
        1ª div no DOM é a dos indicadores, mas visualmente ele some pra
        cima) — assim os indicadores ficam com a largura toda disponível
        e não espremem ao lado do botão, em vez de dividir a tela com ele.
      */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <MapStatsRow stats={stats} />
        </div>
        <Link href="/surgeries/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nova cirurgia
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <MapFilters
          procedures={procedures}
          hospitals={hospitals}
          insuranceProviders={insuranceProviders}
        />
        {/* Ficam juntos de propósito — a linha de filtros já quebra bastante
         * por conta própria, então "Limpar filtros" e o toggle Kanban/Lista
         * sempre aparecem lado a lado, numa linha só. */}
        <div className="flex shrink-0 items-center gap-2">
          <ClearFiltersButton />
          <ViewToggle />
        </div>
      </div>

      <div className="mt-4">
        {isListView ? (
          <MapListTable
            surgeries={surgeries}
            stages={stages}
            openTasksBySurgery={openTasksBySurgery}
            documentsBySurgery={documentsBySurgery}
          />
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
