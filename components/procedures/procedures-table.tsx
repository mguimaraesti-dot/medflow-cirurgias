"use client";

import type { Procedure } from "@/lib/data/procedures";
import { ActiveBadge } from "@/components/shared/active-badge";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";
import { ProcedureRowActions } from "@/components/procedures/procedure-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const columns: SortableColumn<Procedure>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (procedure) => procedure.name,
    cell: (procedure) => <span className="font-medium text-foreground">{procedure.name}</span>,
  },
  {
    key: "internal_code",
    label: "Código",
    accessor: (procedure) => procedure.internal_code,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.internal_code || "—"}</span>,
  },
  {
    key: "tuss_code",
    label: "TUSS",
    accessor: (procedure) => procedure.tuss_code,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.tuss_code || "—"}</span>,
  },
  {
    key: "specialty",
    label: "Especialidade",
    accessor: (procedure) => procedure.specialty,
    cell: (procedure) => <span className="text-muted-foreground">{procedure.specialty || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (procedure) => (procedure.active ? 1 : 0),
    cell: (procedure) => <ActiveBadge active={procedure.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (procedure) => <ProcedureRowActions procedure={procedure} />,
  },
];

export function ProceduresTable({ procedures, emptyMessage }: { procedures: Procedure[]; emptyMessage: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={procedures}
        rowKey={(procedure) => procedure.id}
        emptyMessage={emptyMessage}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(procedure, rowNode) => (
          <ProcedureFormDialog key={procedure.id} procedure={procedure} trigger={rowNode} />
        )}
      />
    </div>
  );
}
