import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listMaterials, type Material } from "@/lib/data/materials";
import { SearchInput } from "@/components/shared/search-input";
import { ActiveBadge } from "@/components/shared/active-badge";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialRowActions } from "@/components/materials/material-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

// A busca de código TUSS (Tabela 19) na base da ANS pode demorar mais que
// o padrão de 10s das Server Actions na Vercel.
export const maxDuration = 30;

const columns: SortableColumn<Material>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (material) => material.name,
    cell: (material) => <span className="font-medium text-foreground">{material.name}</span>,
  },
  {
    key: "internal_code",
    label: "Código",
    accessor: (material) => material.internal_code,
    cell: (material) => <span className="text-muted-foreground">{material.internal_code || "—"}</span>,
  },
  {
    key: "tuss_code",
    label: "TUSS",
    accessor: (material) => material.tuss_code,
    cell: (material) => <span className="text-muted-foreground">{material.tuss_code || "—"}</span>,
  },
  {
    key: "category",
    label: "Categoria",
    accessor: (material) => material.category,
    cell: (material) => <span className="text-muted-foreground">{material.category || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (material) => (material.active ? 1 : 0),
    cell: (material) => <ActiveBadge active={material.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (material) => <MaterialRowActions material={material} />,
  },
];

export default async function MaterialsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("materials");
  const { q } = await searchParams;
  const supabase = await createClient();
  const materials = await listMaterials(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Materiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Materiais e OPME. Um material pode ter vários fornecedores.
          </p>
        </div>
        <MaterialFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {materials.length} material{materials.length === 1 ? "" : "is"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={materials}
          rowKey={(material) => material.id}
          emptyMessage={
            q ? "Nenhum material encontrado para essa busca." : "Nenhum material cadastrado ainda."
          }
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(material, rowNode) => (
            <MaterialFormDialog key={material.id} material={material} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
