import { todayInSaoPaulo } from "@/lib/utils";

/**
 * Status "de agenda" de uma cirurgia — diferente do `status` bruto do
 * banco (active/rescheduled/completed/cancelled). Unifica os 4
 * indicadores do topo da Agenda com o filtro de status e com a cor
 * usada nos cards do calendário e na lista:
 *
 *   prevista   — tem expected_date, ainda sem confirmed_date, dentro do prazo
 *   confirmada — tem confirmed_date
 *   atrasada   — só expected_date, já passou, ainda não confirmada
 *   realizada  — status = completed
 *   cancelada  — status = cancelled
 *   sem_data   — nem confirmed_date nem expected_date (não entra no mês,
 *                só aparece no indicador "Aguardando definição" e na lista)
 *
 * "rescheduled" não é um status de agenda à parte — uma cirurgia
 * reagendada cai em prevista/confirmada/atrasada normalmente, a partir
 * das datas que ela tem agora.
 */
export type ScheduleStatus = "prevista" | "confirmada" | "atrasada" | "realizada" | "cancelada" | "sem_data";

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  prevista: "Prevista",
  confirmada: "Confirmada",
  atrasada: "Atrasada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  sem_data: "Sem data definida",
};

/** Âmbar / verde / vermelho / azul / cinza — cores padronizadas pedidas
 * pro refinamento da agenda. Usa as mesmas classes em todo lugar (card do
 * calendário, lista, indicadores) pra diferenciação ficar bem evidente. */
export const SCHEDULE_STATUS_COLOR: Record<
  ScheduleStatus,
  { dot: string; badge: string; border: string }
> = {
  prevista: {
    dot: "bg-amber-500",
    badge: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-400",
    border: "border-l-amber-500",
  },
  confirmada: {
    dot: "bg-emerald-500",
    badge:
      "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-400",
    border: "border-l-emerald-500",
  },
  atrasada: {
    dot: "bg-red-500",
    badge: "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-400",
    border: "border-l-red-500",
  },
  realizada: {
    dot: "bg-blue-500",
    badge: "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-400",
    border: "border-l-blue-500",
  },
  cancelada: {
    dot: "bg-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
    border: "border-l-border",
  },
  sem_data: {
    dot: "bg-muted-foreground",
    badge: "border-border bg-muted text-muted-foreground",
    border: "border-l-border",
  },
};

export function deriveScheduleStatus(surgery: {
  status: string;
  confirmed_date: string | null;
  expected_date: string | null;
}): ScheduleStatus {
  if (surgery.status === "completed") return "realizada";
  if (surgery.status === "cancelled") return "cancelada";
  if (!surgery.confirmed_date && !surgery.expected_date) return "sem_data";
  if (surgery.confirmed_date) return "confirmada";
  const today = todayInSaoPaulo();
  return surgery.expected_date! < today ? "atrasada" : "prevista";
}
