"use client";

import Link from "next/link";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_LABEL, SCHEDULE_STATUS_COLOR } from "@/lib/schedule-status";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const columns: SortableColumn<ScheduleSurgeryItem>[] = [
  {
    key: "code",
    label: "Código",
    accessor: (surgery) => surgery.code,
    cell: (surgery) => (
      <Link href={`/surgeries/${surgery.id}`} className="font-medium text-foreground hover:underline">
        {surgery.code}
      </Link>
    ),
  },
  {
    key: "procedure",
    label: "Procedimento",
    accessor: (surgery) => surgery.primary_procedure?.name ?? null,
    cell: (surgery) => (
      <span className="text-muted-foreground">
        {surgery.primary_procedure?.name ?? "—"}
        {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
      </span>
    ),
  },
  {
    key: "hospital",
    label: "Hospital",
    accessor: (surgery) => surgery.hospital?.name ?? null,
    cell: (surgery) => <span className="text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>,
  },
  {
    key: "date",
    label: "Data",
    accessor: (surgery) => surgery.confirmed_date ?? surgery.expected_date ?? null,
    cell: (surgery) => (
      <span className="text-muted-foreground">
        {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    accessor: (surgery) => SCHEDULE_STATUS_LABEL[deriveScheduleStatus(surgery)],
    cell: (surgery) => {
      const status = deriveScheduleStatus(surgery);
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SCHEDULE_STATUS_COLOR[status].badge}`}
        >
          {SCHEDULE_STATUS_LABEL[status]}
        </span>
      );
    },
  },
];

export function PatientSurgeryHistoryTable({ surgeries }: { surgeries: ScheduleSurgeryItem[] }) {
  return (
    <div className="overflow-hidden rounded-b-xl">
      <SortableTable
        columns={columns}
        rows={surgeries}
        rowKey={(surgery) => surgery.id}
        emptyMessage="Nenhuma cirurgia registrada para este paciente ainda."
        mobileCardHref={(surgery) => `/surgeries/${surgery.id}`}
      />
    </div>
  );
}
