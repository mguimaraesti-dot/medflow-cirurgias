import Link from "next/link";

import { EmptyRow } from "@/components/shared/empty-row";
import { Badge } from "@/components/ui/badge";
import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

/** Ordenada por data/horário quando a cirurgia tem data (visão normal) —
 * no modo "sem data" (chamado com `surgeries` já sem data nenhuma), fica
 * ordenada por prioridade e depois por data da solicitação, já que não
 * há data de cirurgia pra ordenar. */
export function ScheduleListView({
  surgeries,
  withoutDate = false,
}: {
  surgeries: ScheduleSurgeryItem[];
  withoutDate?: boolean;
}) {
  const sorted = [...surgeries].sort((a, b) => {
    if (withoutDate) {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      const diff = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
      if (diff !== 0) return diff;
      return a.indication_date.localeCompare(b.indication_date);
    }
    const dateA = a.confirmed_date ?? a.expected_date ?? "";
    const dateB = b.confirmed_date ?? b.expected_date ?? "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "");
  });

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            {withoutDate ? <th className="px-4 py-3">Solicitação</th> : <th className="px-4 py-3">Data</th>}
            {!withoutDate ? <th className="px-4 py-3">Horário</th> : null}
            <th className="px-4 py-3">Paciente</th>
            <th className="px-4 py-3">Procedimento</th>
            <th className="px-4 py-3">Hospital</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.length === 0 ? (
            <EmptyRow colSpan={withoutDate ? 5 : 6} message="Nenhuma cirurgia encontrada para esse filtro." />
          ) : (
            sorted.map((surgery) => {
              const scheduleStatus = deriveScheduleStatus(surgery);
              const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
              return (
                <tr key={surgery.id} className="hover:bg-muted">
                  <td className="px-4 py-3 text-muted-foreground">
                    {withoutDate ? formatDate(surgery.indication_date) : formatDate(surgery.confirmed_date ?? surgery.expected_date)}
                  </td>
                  {!withoutDate ? (
                    <td className="px-4 py-3 text-muted-foreground">{formatTime(surgery.confirmed_time)}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Link href={`/surgeries/${surgery.id}`} className="font-medium text-foreground hover:underline">
                      {surgery.patient?.full_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{surgery.primary_procedure?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{surgery.hospital?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={color.badge}>
                      {SCHEDULE_STATUS_LABEL[scheduleStatus]}
                    </Badge>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
