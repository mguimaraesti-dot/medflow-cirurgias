import Link from "next/link";

import { EmptyRow } from "@/components/shared/empty-row";
import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";

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

export function SurgeriesReportTable({ rows }: { rows: ScheduleSurgeryItem[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Cirurgia</th>
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Hospital</th>
            <th className="px-4 py-3">Procedimento</th>
            <th className="px-4 py-3">Atendimento</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <EmptyRow colSpan={7} message="Nenhuma cirurgia encontrada para esse filtro." />
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted">
                <td className="px-4 py-3">
                  <Link href={`/surgeries/${row.id}`} className="font-medium text-foreground hover:underline">
                    {row.code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.patient?.full_name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.hospital?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.primary_procedure?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.attendance_type === "particular" ? "Particular" : row.insurance_provider?.name ?? "Convênio"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{STATUS_LABEL[row.status] ?? row.status}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(row.confirmed_date ?? row.expected_date)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
