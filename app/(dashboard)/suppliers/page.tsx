import { createClient } from "@/lib/supabase/server";
import { listSuppliers } from "@/lib/data/suppliers";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierActiveToggle } from "@/components/suppliers/supplier-active-toggle";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const suppliers = await listSuppliers(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Fornecedores</h1>
          <p className="mt-1 text-sm text-slate-500">
            Fornecedores de materiais e OPME. Fornecedores inativos não podem ser
            selecionados em novas solicitações.
          </p>
        </div>
        <SupplierFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por razão social ou nome fantasia..." />
        <p className="text-sm text-slate-500">
          {suppliers.length} fornecedor{suppliers.length === 1 ? "" : "es"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Razão social</th>
              <th className="px-4 py-3">Nome fantasia</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                <tr key={supplier.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{supplier.company_name}</td>
                  <td className="px-4 py-3 text-slate-600">{supplier.trade_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {supplier.contact_name || supplier.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={supplier.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <SupplierFormDialog supplier={supplier} />
                      <SupplierActiveToggle id={supplier.id} active={supplier.active} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
