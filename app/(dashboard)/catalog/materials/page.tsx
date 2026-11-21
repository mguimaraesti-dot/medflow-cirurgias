import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listMaterials } from "@/lib/data/materials";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialRowActions } from "@/components/materials/material-row-actions";

// A busca de código TUSS (Tabela 19) na base da ANS pode demorar mais que
// o padrão de 10s das Server Actions na Vercel.
export const maxDuration = 30;

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
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">TUSS</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {materials.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={
                  q
                    ? "Nenhum material encontrado para essa busca."
                    : "Nenhum material cadastrado ainda."
                }
              />
            ) : (
              materials.map((material) => (
                <MaterialFormDialog
                  key={material.id}
                  material={material}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{material.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {material.internal_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {material.tuss_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {material.category || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={material.active} />
                      </td>
                      <td className="px-4 py-3">
                        <MaterialRowActions material={material} />
                      </td>
                    </tr>
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
