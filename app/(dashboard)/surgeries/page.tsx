import Link from "next/link";
import { ChevronRight, LayoutGrid, Plus, CalendarPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listSurgeriesPage } from "@/lib/data/surgeries-list";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { activeFilterCount, parseSurgeryListParams } from "@/lib/surgery-list-params";
import { Button } from "@/components/ui/button";
import { SurgeryListStatsCards } from "@/components/surgeries/surgery-list-stats";
import { SurgeryListFilters } from "@/components/surgeries/surgery-list-filters";
import { SurgeryListTable } from "@/components/surgeries/surgery-list-table";
import { SurgeryListPagination } from "@/components/surgeries/surgery-list-pagination";

export default async function SurgeriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModuleView("surgeries");
  const params = parseSurgeryListParams(await searchParams);
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ rows, total, page, pageCount, stats }, hospitals, canEdit] = await Promise.all([
    listSurgeriesPage(supabase, params),
    listActiveHospitalsForSelect(supabase),
    user ? hasPermission(user, "surgeries", "edit") : Promise.resolve(false),
  ]);

  const filtered = activeFilterCount(params) > 0;

  return (
    <div className="mx-auto w-full max-w-[1920px]">
      <nav aria-label="Navegação" className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/kanban" className="hover:text-foreground">
          Mapa Cirúrgico
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Cirurgias</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CalendarPlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Cirurgias</h1>
            <p className="text-sm text-muted-foreground">
              Todas as cirurgias cadastradas, incluindo realizadas e canceladas.
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link href="/kanban" className="flex-1 sm:flex-none">
            <Button variant="outline" className="h-10 w-full">
              <LayoutGrid className="h-4 w-4" />
              Mapa Cirúrgico
            </Button>
          </Link>
          {canEdit ? (
            <Link href="/surgeries/new" className="flex-1 sm:flex-none">
              <Button className="h-10 w-full">
                <Plus className="h-4 w-4" />
                Nova Cirurgia
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <SurgeryListStatsCards stats={stats} params={params} />
      </div>

      <div className="mt-4">
        <SurgeryListFilters hospitals={hospitals} activeCount={activeFilterCount(params)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <SurgeryListTable
          rows={rows}
          params={params}
          canEdit={canEdit}
          emptyMessage={
            filtered
              ? "Nenhuma cirurgia encontrada com esses filtros."
              : "Nenhuma cirurgia cadastrada ainda."
          }
        />
        <SurgeryListPagination params={params} page={page} pageCount={pageCount} total={total} shown={rows.length} />
      </div>
    </div>
  );
}
