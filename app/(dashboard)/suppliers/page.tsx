import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSuppliers } from "@/lib/data/suppliers";
import { SearchInput } from "@/components/shared/search-input";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("suppliers");
  const { q } = await searchParams;
  const supabase = await createClient();
  const suppliers = await listSuppliers(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Fornecedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fornecedores de materiais e OPME. Fornecedores inativos não podem ser
            selecionados em novas solicitações.
          </p>
        </div>
        <SupplierFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por razão social ou nome fantasia..." />
        <p className="text-sm text-muted-foreground">
          {suppliers.length} fornecedor{suppliers.length === 1 ? "" : "es"}
        </p>
      </div>

      <SuppliersTable
        suppliers={suppliers}
        emptyMessage={
          q ? "Nenhum fornecedor encontrado para essa busca." : "Nenhum fornecedor cadastrado ainda."
        }
      />
    </div>
  );
}
