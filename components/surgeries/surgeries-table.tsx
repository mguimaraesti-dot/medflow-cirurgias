"use client";

import Link from "next/link";

import type { SurgeryListItem } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "default" | "outline"> = {
  active: "secondary",
  rescheduled: "outline",
  cancelled: "destructive",
  completed: "default",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const columns: SortableColumn<SurgeryListItem>[] = [
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
    key: "patient",
    label: "Paciente",
    accessor: (surgery) => surgery.patient?.full_name ?? null,
    cell: (surgery) => <span className="text-muted-foreground">{surgery.patient?.full_name ?? "—"}</span>,
  },
  {
    key: "hospital",
    label: "Hospital",
    accessor: (surgery) => surgery.hospital?.name ?? null,
    cell: (surgery) => <span className="text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>,
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
    key: "indication_date",
    label: "Solicitação",
    accessor: (surgery) => surgery.indication_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.indication_date)}</span>,
  },
  {
    key: "expected_date",
    label: "Prevista",
    accessor: (surgery) => surgery.expected_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.expected_date)}</span>,
  },
  {
    key: "confirmed_date",
    label: "Confirmada",
    accessor: (surgery) => surgery.confirmed_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.confirmed_date)}</span>,
  },
  {
    key: "status",
    label: "Status",
    accessor: (surgery) => STATUS_LABEL[surgery.status] ?? surgery.status,
    cell: (surgery) => (
      <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>
        {STATUS_LABEL[surgery.status] ?? surgery.status}
      </Badge>
    ),
  },
];

export function SurgeriesTable({ surgeries, emptyMessage }: { surgeries: SurgeryListItem[]; emptyMessage: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={surgeries}
        rowKey={(surgery) => surgery.id}
        emptyMessage={emptyMessage}
        mobileCardHref={(surgery) => `/surgeries/${surgery.id}`}
      />
    </div>
  );
}
