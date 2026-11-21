"use client";

import { Badge } from "@/components/ui/badge";
import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
import { ScheduleDetailSheet } from "@/components/schedule/schedule-detail-sheet";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Por padrão ordenada por data/horário quando a cirurgia tem data (visão
 * normal) — no modo "sem data" (chamado com `surgeries` já sem data
 * nenhuma), a ordenação inicial é por prioridade e depois pela data da
 * solicitação, já que não há data de cirurgia pra ordenar. O cabeçalho
 * continua clicável para o usuário trocar o critério quando quiser. */
export function ScheduleListView({
  surgeries,
  withoutDate = false,
}: {
  surgeries: ScheduleSurgeryItem[];
  withoutDate?: boolean;
}) {
  // Ordem inicial (antes de qualquer clique no cabeçalho): por data/horário
  // na visão normal, ou por prioridade + data da solicitação no modo "sem
  // data". O usuário pode trocar o critério clicando em qualquer coluna.
  const initialRows = [...surgeries].sort((a, b) => {
    if (withoutDate) {
      const diff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (diff !== 0) return diff;
      return a.indication_date.localeCompare(b.indication_date);
    }
    const dateA = a.confirmed_date ?? a.expected_date ?? "";
    const dateB = b.confirmed_date ?? b.expected_date ?? "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.confirmed_time ?? "").localeCompare(b.confirmed_time ?? "");
  });

  const columns: SortableColumn<ScheduleSurgeryItem>[] = [
    withoutDate
      ? {
          key: "indication_date",
          label: "Solicitação",
          accessor: (surgery) => surgery.indication_date,
          cell: (surgery) => (
            <span className="text-muted-foreground">{formatDate(surgery.indication_date)}</span>
          ),
        }
      : {
          key: "date",
          label: "Data",
          accessor: (surgery) => surgery.confirmed_date ?? surgery.expected_date ?? null,
          cell: (surgery) => (
            <span className="text-muted-foreground">
              {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
            </span>
          ),
        },
    ...(!withoutDate
      ? [
          {
            key: "time",
            label: "Horário",
            accessor: (surgery: ScheduleSurgeryItem) => surgery.confirmed_time,
            cell: (surgery: ScheduleSurgeryItem) => (
              <span className="text-muted-foreground">{formatTime(surgery.confirmed_time)}</span>
            ),
          } as SortableColumn<ScheduleSurgeryItem>,
        ]
      : []),
    {
      key: "patient",
      label: "Paciente",
      accessor: (surgery) => surgery.patient?.full_name ?? null,
      cell: (surgery) => (
        <ScheduleDetailSheet
          surgery={surgery}
          trigger={
            <button type="button" className="font-medium text-foreground hover:underline">
              {surgery.patient?.full_name ?? "—"}
            </button>
          }
        />
      ),
    },
    {
      key: "procedure",
      label: "Procedimento",
      accessor: (surgery) => surgery.primary_procedure?.name ?? null,
      cell: (surgery) => (
        <span className="text-muted-foreground">{surgery.primary_procedure?.name ?? "—"}</span>
      ),
    },
    {
      key: "hospital",
      label: "Hospital",
      accessor: (surgery) => surgery.hospital?.name ?? null,
      cell: (surgery) => <span className="text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      accessor: (surgery) => SCHEDULE_STATUS_LABEL[deriveScheduleStatus(surgery)],
      cell: (surgery) => {
        const scheduleStatus = deriveScheduleStatus(surgery);
        const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
        return (
          <Badge variant="outline" className={color.badge}>
            {SCHEDULE_STATUS_LABEL[scheduleStatus]}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={initialRows}
        rowKey={(surgery) => surgery.id}
        emptyMessage="Nenhuma cirurgia encontrada para esse filtro."
      />
    </div>
  );
}
