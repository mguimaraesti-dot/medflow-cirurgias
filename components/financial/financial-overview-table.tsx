"use client";

import Link from "next/link";

import type { FinancialOverviewRow } from "@/lib/data/financial";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatBRL(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

// Só particular por enquanto (ver financial-panel.tsx) — por isso sem
// coluna de Atendimento/Glosado, que só fariam sentido com convênio.
export function FinancialOverviewTable({ rows }: { rows: FinancialOverviewRow[] }) {
  const columns: SortableColumn<FinancialOverviewRow>[] = [
    {
      key: "code",
      label: "Cirurgia",
      accessor: (row) => row.surgery?.code ?? null,
      cell: (row) => (
        <Link href={`/surgeries/${row.surgery_id}`} className="font-medium text-foreground hover:underline">
          {row.surgery?.code ?? "—"}
        </Link>
      ),
    },
    {
      key: "patient",
      label: "Paciente",
      accessor: (row) => row.surgery?.patient?.full_name ?? null,
      cell: (row) => <span className="text-muted-foreground">{row.surgery?.patient?.full_name ?? "—"}</span>,
    },
    {
      key: "hospital",
      label: "Hospital",
      accessor: (row) => row.surgery?.hospital?.name ?? null,
      cell: (row) => <span className="text-muted-foreground">{row.surgery?.hospital?.name ?? "—"}</span>,
    },
    {
      key: "date",
      label: "Data",
      accessor: (row) => row.surgery?.confirmed_date ?? row.surgery?.expected_date ?? null,
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.surgery?.confirmed_date ?? row.surgery?.expected_date ?? null)}
        </span>
      ),
    },
    {
      key: "expected",
      label: "Valor acordado",
      accessor: (row) => row.agreed_value ?? row.expected_value ?? null,
      cell: (row) => {
        const expected = row.agreed_value ?? row.expected_value;
        return <span className="text-foreground">{formatBRL(expected)}</span>;
      },
    },
    {
      key: "received",
      label: "Recebido",
      accessor: (row) => row.received_value,
      cell: (row) => (
        <span className="text-emerald-600 dark:text-emerald-400">{formatBRL(row.received_value)}</span>
      ),
    },
    {
      key: "balance",
      label: "Saldo",
      accessor: (row) => (row.agreed_value ?? row.expected_value ?? 0) - row.received_value,
      cell: (row) => {
        const expected = row.agreed_value ?? row.expected_value;
        const balance = (expected ?? 0) - row.received_value;
        return <span className="font-medium text-foreground">{formatBRL(balance)}</span>;
      },
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum registro financeiro encontrado para esse filtro."
        mobileCardHref={(row) => `/surgeries/${row.surgery_id}`}
      />
    </div>
  );
}
