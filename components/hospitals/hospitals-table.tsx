"use client";

import type { Hospital } from "@/lib/data/hospitals";
import { ActiveBadge } from "@/components/shared/active-badge";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { HospitalRowActions } from "@/components/hospitals/hospital-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const columns: SortableColumn<Hospital>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (hospital) => hospital.name,
    cell: (hospital) => <span className="font-medium text-foreground">{hospital.name}</span>,
  },
  {
    key: "phone",
    label: "Telefone",
    accessor: (hospital) => hospital.phone,
    cell: (hospital) => <span className="text-muted-foreground">{hospital.phone || "—"}</span>,
  },
  {
    key: "email",
    label: "E-mail",
    accessor: (hospital) => hospital.email,
    cell: (hospital) => <span className="text-muted-foreground">{hospital.email || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (hospital) => (hospital.active ? 1 : 0),
    cell: (hospital) => <ActiveBadge active={hospital.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (hospital) => <HospitalRowActions hospital={hospital} />,
  },
];

export function HospitalsTable({ hospitals, emptyMessage }: { hospitals: Hospital[]; emptyMessage: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={hospitals}
        rowKey={(hospital) => hospital.id}
        emptyMessage={emptyMessage}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(hospital, rowNode) => (
          <HospitalFormDialog key={hospital.id} hospital={hospital} trigger={rowNode} />
        )}
      />
    </div>
  );
}
