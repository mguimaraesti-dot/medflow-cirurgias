"use client";

import Link from "next/link";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const columns: SortableColumn<ScheduleSurgeryItem>[] = [
  {
    key: "code",
    label: "Cirurgia",
    accessor: (row) => row.code,
    cell: (row) => (
      <Link href={`/surgeries/${row.id}`} className="font-medium text-foreground hover:underline">
        {row.code}
      </Link>
    ),
  },
  {
    key: "patient",
    label: "Paciente",
    accessor: (row) => row.patient?.full_name ?? null,
    cell: (row) => <span className="text-muted-foreground">{row.patient?.full_name ?? "—"}</span>,
  },
  {
    key: "hospital",
    label: "Hospital",
    accessor: (row) => row.hospital?.name ?? null,
    cell: (row) => <span className="text-muted-foreground">{row.hospital?.name ?? "—"}</span>,
  },
  {
    key: "procedure",
    label: "Procedimento",
    accessor: (row) => row.primary_procedure?.name ?? null,
    cell: (row) => <span className="text-muted-foreground">{row.primary_procedure?.name ?? "—"}</span>,
  },
  {
    key: "attendance",
    label: "Atendimento",
    accessor: (row) => (row.attendance_type === "particular" ? "Particular" : row.insurance_provider?.name ?? "Convênio"),
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.attendance_type === "particular" ? "Particular" : row.insurance_provider?.name ?? "Convênio"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    accessor: (row) => STATUS_LABEL[row.status] ?? row.status,
    cell: (row) => <span className="text-muted-foreground">{STATUS_LABEL[row.status] ?? row.status}</span>,
  },
  {
    key: "date",
    label: "Data",
    accessor: (row) => row.confirmed_date ?? row.expected_date ?? null,
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.confirmed_date ?? row.expected_date)}</span>
    ),
  },
];

export function SurgeriesReportTable({ rows }: { rows: ScheduleSurgeryItem[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma cirurgia encontrada para esse filtro."
      />
    </div>
  );
}
