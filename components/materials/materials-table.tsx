"use client";

import type { Material } from "@/lib/data/materials";
import { ActiveBadge } from "@/components/shared/active-badge";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialRowActions } from "@/components/materials/material-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function buildColumns(activeSuppliers: { id: string; company_name: string }[]): SortableColumn<Material>[] {
  return [
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
      cell: (material) => <MaterialRowActions material={material} activeSuppliers={activeSuppliers} />,
    },
  ];
}

export function MaterialsTable({
  materials,
  activeSuppliers,
  emptyMessage,
}: {
  materials: Material[];
  activeSuppliers: { id: string; company_name: string }[];
  emptyMessage: string;
}) {
  const columns = buildColumns(activeSuppliers);
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={materials}
        rowKey={(material) => material.id}
        emptyMessage={emptyMessage}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(material, rowNode) => (
          <MaterialFormDialog key={material.id} material={material} trigger={rowNode} />
        )}
      />
    </div>
  );
}
