import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listProcedures } from "@/lib/data/procedures";
import { listActiveMaterialsForSelect } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { SearchInput } from "@/components/shared/search-input";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProceduresTable } from "@/components/procedures/procedures-table";

// A busca de código TUSS (ANS) pode demorar além do padrão de 10s das
// Server Actions na Vercel — damos mais margem para essa rota.
export const maxDuration = 30;

export default async function ProceduresCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("procedures");
  const { q } = await searchParams;
  const supabase = await createClient();
  const [procedures, materials, suppliers] = await Promise.all([
    listProcedures(supabase, q),
    listActiveMaterialsForSelect(supabase),
    listActiveSuppliersForSelect(supabase),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Procedimentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Procedimentos reutilizáveis, cada um com seu kit de materiais padrão.
          </p>
        </div>
        <ProcedureFormDialog />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {procedures.length} procedimento{procedures.length === 1 ? "" : "s"}
        </p>
      </div>

      <ProceduresTable
        procedures={procedures}
        materials={materials}
        suppliers={suppliers}
        emptyMessage={
          q ? "Nenhum procedimento encontrado para essa busca." : "Nenhum procedimento cadastrado ainda."
        }
      />
    </div>
  );
}
