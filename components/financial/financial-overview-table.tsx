import Link from "next/link";

import { EmptyRow } from "@/components/shared/empty-row";
import { Badge } from "@/components/ui/badge";
import type { FinancialOverviewRow } from "@/lib/data/financial";

function formatBRL(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function FinancialOverviewTable({ rows }: { rows: FinancialOverviewRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Cirurgia</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Hospital</th>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Atendimento</th>
            <th className="px-4 py-3">Previsto/faturado</th>
            <th className="px-4 py-3">Recebido</th>
            <th className="px-4 py-3">Glosado</th>
            <th className="px-4 py-3">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <EmptyRow colSpan={9} message="Nenhum registro financeiro encontrado para esse filtro." />
          ) : (
            rows.map((row) => {
              const expected =
                row.attendance_type === "particular" ? row.agreed_value ?? row.expected_value : row.billed_value ?? row.expected_value;
              const balance = (expected ?? 0) - row.received_value;
              return (
                <tr key={row.id} className="hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link
                      href={`/surgeries/${row.surgery_id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {row.surgery?.code ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.surgery?.patient?.full_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.surgery?.hospital?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(row.surgery?.confirmed_date ?? row.surgery?.expected_date ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.attendance_type === "particular" ? "Particular" : "Convênio"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground">{formatBRL(expected)}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{formatBRL(row.received_value)}</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400">{row.glossed_value > 0 ? formatBRL(row.glossed_value) : "—"}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatBRL(balance)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
