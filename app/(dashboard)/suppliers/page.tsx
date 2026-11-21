import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSuppliers } from "@/lib/data/suppliers";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierRowActions } from "@/components/suppliers/supplier-row-actions";

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

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Razão social</th>
              <th className="px-4 py-3">Nome fantasia</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {suppliers.length === 0 ? (
              <EmptyRow
                colSpan={5}
                message={
                  q
                    ? "Nenhum fornecedor encontrado para essa busca."
                    : "Nenhum fornecedor cadastrado ainda."
                }
              />
            ) : (
              suppliers.map((supplier) => (
                <SupplierFormDialog
                  key={supplier.id}
                  supplier={supplier}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {supplier.company_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {supplier.trade_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {supplier.contact_name || supplier.phone || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={supplier.active} />
                      </td>
                      <td className="px-4 py-3">
                        <SupplierRowActions supplier={supplier} />
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
