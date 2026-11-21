"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListTodo, Building2, Clock, Stethoscope, CalendarClock } from "lucide-react";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { RequirementBadges } from "@/components/kanban/requirement-badges";
import { SurgeryDetailSheet } from "@/components/kanban/surgery-detail-sheet";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<SurgeryListItem["priority"], string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VARIANT: Record<SurgeryListItem["priority"], "secondary" | "info" | "warning" | "destructive"> = {
  low: "secondary",
  normal: "info",
  high: "warning",
  urgent: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

/** Dias corridos desde a solicitação (indication_date), pra mostrar no
 * canto do card quanto tempo essa cirurgia já está esperando. */
function daysSinceIndication(value: string): number {
  const start = new Date(value + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / 86_400_000));
}

export function KanbanCard({
  surgery,
  stages,
  openTasksCount = 0,
}: {
  surgery: SurgeryListItem;
  stages: WorkflowStage[];
  openTasksCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: surgery.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  const date = surgery.confirmed_date
    ? formatDate(surgery.confirmed_date)
    : formatDate(surgery.expected_date);

  const attendanceLabel =
    surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio";
  const waitingDays = daysSinceIndication(surgery.indication_date);

  return (
    // O painel de detalhe (SurgeryDetailSheet) é renderizado como irmão
    // desta div, fora dela de propósito: mesmo o conteúdo do Sheet
    // aparecendo em outro lugar da tela (via portal), o React ainda o
    // considera filho desta div pra fins de propagação de evento — se
    // ficasse aninhado aqui dentro, os `listeners` do dnd-kit (arrastar o
    // card) capturariam cliques e arrastos feitos dentro do painel,
    // inclusive no botão de fechar (X), que o dnd-kit interpretava como
    // início de um arraste do card.
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={() => {
          if (!isDragging) setOpen(true);
        }}
        className={cn(
          "cursor-grab rounded-lg border border-border bg-card p-3 text-sm shadow-sm hover:border-ring active:cursor-grabbing",
          isDragging && "opacity-50"
        )}
      >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="whitespace-nowrap font-medium text-foreground">{surgery.code}</span>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="flex items-center gap-0.5 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            title={`${waitingDays} dia${waitingDays === 1 ? "" : "s"} desde a solicitação`}
          >
            <CalendarClock className="h-2.5 w-2.5" />
            {waitingDays}d
          </span>
          <Badge variant={PRIORITY_VARIANT[surgery.priority]}>{PRIORITY_LABEL[surgery.priority]}</Badge>
        </div>
      </div>
      <p className="mt-1 truncate text-foreground">{surgery.patient?.full_name ?? "—"}</p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-medium text-foreground">
        <Stethoscope className="h-3 w-3 shrink-0 text-muted-foreground" />
        {surgery.primary_procedure?.name ?? "—"}
        {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
      </p>
      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
        <Building2 className="h-3 w-3 shrink-0" />
        {surgery.hospital?.name ?? "—"}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{attendanceLabel}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {date ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {date}
          </span>
        ) : null}
        {openTasksCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <ListTodo className="h-3 w-3" />
            {openTasksCount} tarefa{openTasksCount === 1 ? "" : "s"} aberta{openTasksCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="mt-2 border-t border-border pt-1.5">
        <RequirementBadges requirements={surgery.requirements} />
      </div>
      </div>
      <SurgeryDetailSheet surgery={surgery} stages={stages} open={open} onOpenChange={setOpen} />
    </>
  );
}
