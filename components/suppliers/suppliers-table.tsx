"use client";

import type { Supplier } from "@/lib/data/suppliers";
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

export function SuppliersTable({ suppliers, emptyMessage }: { suppliers: Supplier[]; emptyMessage: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={suppliers}
        rowKey={(supplier) => supplier.id}
        emptyMessage={emptyMessage}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(supplier, rowNode) => (
          <SupplierFormDialog key={supplier.id} supplier={supplier} trigger={rowNode} />
        )}
      />
    </div>
  );
}
