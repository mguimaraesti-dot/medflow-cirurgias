"use client";

import Link from "next/link";

import {
  financialBaseValue,
  financialPaymentStatus,
  financialProcedureSummary,
  financialRowDate,
  type FinancialOverviewRow,
  type FinancialPaymentStatus,
  type Installment,
} from "@/lib/data/financial";
import { ReceiveSheetButton } from "@/components/financial/receive-sheet";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";
import { cn } from "@/lib/utils";

function formatBRL(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS: Record<FinancialPaymentStatus, { label: string; className: string; bar: string; order: number }> = {
  undefined: {
    label: "Sem valor definido",
    className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    order: 0,
  },
  open: {
    label: "A receber",
    className: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    order: 1,
  },
  partial: {
    label: "Recebido parcial",
    className: "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    order: 2,
  },
  paid: {
    label: "Quitado",
    className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    order: 3,
  },
};

function StatusBadge({ row }: { row: FinancialOverviewRow }) {
  const s = STATUS[financialPaymentStatus(row)];
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", s.className)}>{s.label}</span>
  );
}

// Só particular por enquanto (ver financial-panel.tsx) — por isso sem
// coluna de Atendimento/Glosado, que só fariam sentido com convênio.
export function FinancialOverviewTable({
  rows,
  installmentsByRecord,
  canReceive = false,
}: {
  rows: FinancialOverviewRow[];
  /** Parcelas por registro financeiro — necessário para o botão "Receber". */
  installmentsByRecord?: Record<string, Installment[]>;
  /** Mostra o botão "Receber" (quem tem permissão de editar o financeiro). */
  canReceive?: boolean;
}) {
  const columns: SortableColumn<FinancialOverviewRow>[] = [
    {
      key: "patient",
      label: "Paciente",
      accessor: (row) => row.surgery?.patient?.full_name ?? null,
      cell: (row) => {
        const proc = financialProcedureSummary(row);
        return (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={`/surgeries/${row.surgery_id}`} className="text-sm font-semibold text-foreground hover:underline">
              {row.surgery?.patient?.full_name ?? "Sem paciente"}
            </Link>
            <span className="text-xs text-muted-foreground">
              {row.surgery?.code ?? "—"}
              {proc.name ? (
                <>
                  {" · "}
                  <span className="text-foreground/80">{proc.name}</span>
                  {proc.extra > 0 ? ` +${proc.extra}` : ""}
                </>
              ) : null}
            </span>
          </div>
        );
      },
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
      accessor: (row) => financialRowDate(row),
      cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(financialRowDate(row))}</span>,
    },
    {
      key: "expected",
      label: "Valor acordado",
      accessor: (row) => financialBaseValue(row),
      cell: (row) => <span className="whitespace-nowrap text-foreground">{formatBRL(financialBaseValue(row))}</span>,
    },
    {
      key: "received",
      label: "Recebido",
      accessor: (row) => row.received_value,
      cell: (row) => {
        const base = financialBaseValue(row);
        const pct = base && base > 0 ? Math.min(100, Math.round((row.received_value / base) * 100)) : 0;
        const s = STATUS[financialPaymentStatus(row)];
        return (
          <div className="flex min-w-[7rem] flex-col gap-1">
            <span className="whitespace-nowrap text-emerald-600 dark:text-emerald-400">{formatBRL(row.received_value)}</span>
            {base && base > 0 ? (
              <span className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct}% recebido`}>
                <span className={cn("block h-full rounded-full", s.bar)} style={{ width: `${pct}%` }} />
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "balance",
      label: "Saldo",
      accessor: (row) => (financialBaseValue(row) ?? 0) - row.received_value,
      cell: (row) => {
        const base = financialBaseValue(row);
        const balance = (base ?? 0) - row.received_value;
        return (
          <span className={cn("whitespace-nowrap font-semibold", balance > 0 ? "text-foreground" : "text-muted-foreground")}>
            {base == null ? "—" : formatBRL(Math.max(0, balance))}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Situação",
      accessor: (row) => STATUS[financialPaymentStatus(row)].order,
      cell: (row) => <StatusBadge row={row} />,
    },
  ];

  if (canReceive && installmentsByRecord) {
    columns.push({
      key: "actions",
      label: "",
      className: "text-right",
      cell: (row) => <ReceiveSheetButton row={row} installments={installmentsByRecord[row.id] ?? []} />,
    });
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum registro financeiro encontrado para esse filtro."
        mobileCardHref={(row) => `/surgeries/${row.surgery_id}`}
        defaultSort={{ key: "date", direction: "asc" }}
      />
    </div>
  );
}
