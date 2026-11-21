import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSuppliers, type Supplier } from "@/lib/data/suppliers";
import { SearchInput } from "@/components/shared/search-input";
import { ActiveBadge } from "@/components/shared/active-badge";
import { SupplierFormDialog } from "@/components/suppliers/supplier-form-dialog";
import { SupplierRowActions } from "@/components/suppliers/supplier-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const columns: SortableColumn<Supplier>[] = [
  {
    key: "company_name",
    label: "Razão social",
    accessor: (supplier) => supplier.company_name,
    cell: (supplier) => <span className="font-medium text-foreground">{supplier.company_name}</span>,
  },
  {
    key: "trade_name",
    label: "Nome fantasia",
    accessor: (supplier) => supplier.trade_name,
    cell: (supplier) => <span className="text-muted-foreground">{supplier.trade_name || "—"}</span>,
  },
  {
    key: "contact",
    label: "Contato",
    accessor: (supplier) => supplier.contact_name ?? supplier.phone,
    cell: (supplier) => (
      <span className="text-muted-foreground">{supplier.contact_name || supplier.phone || "—"}</span>
    ),
  },
  {
    key: "active",
    label: "Status",
    accessor: (supplier) => (supplier.active ? 1 : 0),
    cell: (supplier) => <ActiveBadge active={supplier.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (supplier) => <SupplierRowActions supplier={supplier} />,
  },
];

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
        <SortableTable
          columns={columns}
          rows={suppliers}
          rowKey={(supplier) => supplier.id}
          emptyMessage={
            q ? "Nenhum fornecedor encontrado para essa busca." : "Nenhum fornecedor cadastrado ainda."
          }
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(supplier, rowNode) => (
            <SupplierFormDialog key={supplier.id} supplier={supplier} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
