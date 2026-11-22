import Link from "next/link";
import { ChevronRight, Scissors } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listProceduresPage } from "@/lib/data/procedures-list";
import {
  PROCEDURE_PAGE_SIZES,
  parseProcedureListParams,
  procedureActiveFilterCount,
} from "@/lib/procedure-list-params";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureListStatsCards } from "@/components/procedures/procedure-list-stats";
import { ProcedureListFilters } from "@/components/procedures/procedure-list-filters";
import { ProcedureListTable } from "@/components/procedures/procedure-list-table";
import { ListPagination } from "@/components/shared/list-pagination";

// A busca de código TUSS (ANS) pode demorar além do padrão de 10s das
// Server Actions na Vercel — damos mais margem para essa rota.
export const maxDuration = 30;

export default async function ProceduresCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModuleView("procedures");
  const params = parseProcedureListParams(await searchParams);
  const supabase = await createClient();
  const user = await getCurrentUser();

  const [{ rows, total, page, pageCount, stats, specialties, locations }, canEdit] = await Promise.all([
    listProceduresPage(supabase, params),
    user ? hasPermission(user, "procedures", "edit") : Promise.resolve(false),
  ]);

  const filterCount = procedureActiveFilterCount(params);

  return (
    <div className="mx-auto w-full max-w-[1920px]">
      <nav aria-label="Navegação" className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/kanban" className="hover:text-foreground">
          Mapa Cirúrgico
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Procedimentos</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Scissors className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Procedimentos</h1>
            <p className="text-sm text-muted-foreground">
              Procedimentos reutilizáveis, cada um com seu kit de materiais padrão.
            </p>
          </div>
        </div>
        {canEdit ? <ProcedureFormDialog /> : null}
      </div>

      <div className="mt-5">
        <ProcedureListStatsCards stats={stats} params={params} />
      </div>

      <div className="mt-4">
        <ProcedureListFilters specialties={specialties} locations={locations} activeCount={filterCount} />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ProcedureListTable
          rows={rows}
          params={params}
          canEdit={canEdit}
          emptyMessage={
            filterCount > 0 ? "Nenhum procedimento encontrado com esses filtros." : "Nenhum procedimento cadastrado ainda."
          }
        />
        <ListPagination
          sizes={PROCEDURE_PAGE_SIZES}
          size={params.size}
          page={page}
          pageCount={pageCount}
          total={total}
          shown={rows.length}
        />
      </div>
    </div>
  );
}
