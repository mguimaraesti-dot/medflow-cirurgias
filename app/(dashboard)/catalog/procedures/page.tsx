import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listProcedures, type Procedure } from "@/lib/data/procedures";
import { SearchInput } from "@/components/shared/search-input";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureRowActions } from "@/components/procedures/procedure-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

// A busca de código TUSS (ANS) pode demorar além do padrão de 10s das
// Server Actions na Vercel — damos mais margem para essa rota.
export const maxDuration = 30;

const columns: SortableColumn<Procedure>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (procedure) => procedure.name,
    cell: (procedure) => <span className="font-medium text-foreground">{procedure.name}</span>,
  },
  {
    key: "internal_code",
    label: "Código",
    accessor: (procedure) => procedure.internal_code,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.internal_code || "—"}</span>,
  },
  {
    key: "tuss_code",
    label: "TUSS",
    accessor: (procedure) => procedure.tuss_code,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.tuss_code || "—"}</span>,
  },
  {
    key: "specialty",
    label: "Especialidade",
    accessor: (procedure) => procedure.specialty,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.specialty || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (procedure) => (procedure.active ? 1 : 0),
    cell: (procedure) => <ActiveBadge active={procedure.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (procedure) => <ProcedureRowActions procedure={procedure} />,
  },
];

export default async function ProceduresCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("procedures");
  const { q } = await searchParams;
  const supabase = await createClient();
  const procedures = await listProcedures(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Procedimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Procedimentos reutilizáveis, cada um com seu kit de materiais padrão.
          </p>
        </div>
        <ProcedureFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {procedures.length} procedimento{procedures.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={procedures}
          rowKey={(procedure) => procedure.id}
          emptyMessage={
            q ? "Nenhum procedimento encontrado para essa busca." : "Nenhum procedimento cadastrado ainda."
          }
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(procedure, rowNode) => (
            <ProcedureFormDialog key={procedure.id} procedure={procedure} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
