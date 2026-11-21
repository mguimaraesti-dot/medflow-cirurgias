import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listMaterials } from "@/lib/data/materials";
import { SearchInput } from "@/components/shared/search-input";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialsTable } from "@/components/materials/materials-table";

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

      <MaterialsTable
        materials={materials}
        emptyMessage={
          q ? "Nenhum material encontrado para essa busca." : "Nenhum material cadastrado ainda."
        }
      />
    </div>
  );
}
