"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ListTodo,
  ShieldAlert,
  PackageX,
  Building2,
  ClipboardX,
  Clock,
  Stethoscope,
  CalendarClock,
} from "lucide-react";

import type { SurgeryListItem } from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<SurgeryListItem["priority"], string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_CLASS: Record<SurgeryListItem["priority"], string> = {
  low: "bg-muted text-muted-foreground border-border",
  normal:
    "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  high: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  urgent: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
};

// Um ícone + rótulo curto por tipo de requisito — só aparece quando está
// de fato pendente (não satisfeito e não dispensado), pra manter o card
// enxuto: nada aqui quando está tudo em dia.
const REQUIREMENT_BADGE: Record<string, { label: string; icon: typeof ShieldAlert }> = {
  authorization: { label: "Autorização pendente", icon: ShieldAlert },
  materials: { label: "Materiais pendentes", icon: PackageX },
  or_reservation: { label: "Reserva pendente", icon: Building2 },
  preoperative: { label: "Pré-op pendente", icon: ClipboardX },
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

function pendingRequirements(requirements: SurgeryListItem["requirements"]) {
  return requirements
    .filter((r) => !r.is_satisfied && !r.waived)
    .map((r) => REQUIREMENT_BADGE[r.requirement_key])
    .filter((badge): badge is { label: string; icon: typeof ShieldAlert } => Boolean(badge));
}

export function KanbanCard({
  surgery,
  openTasksCount = 0,
}: {
  surgery: SurgeryListItem;
  openTasksCount?: number;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: surgery.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
    : undefined;

  const date = surgery.confirmed_date
    ? formatDate(surgery.confirmed_date)
    : formatDate(surgery.expected_date);

  const pending = pendingRequirements(surgery.requirements);
  const attendanceLabel =
    surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio";
  const waitingDays = daysSinceIndication(surgery.indication_date);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => {
        if (!isDragging) router.push(`/surgeries/${surgery.id}`);
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
          <Badge className={cn("border", PRIORITY_CLASS[surgery.priority])} variant="outline">
            {PRIORITY_LABEL[surgery.priority]}
          </Badge>
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

      {pending.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-1.5">
          {pending.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
            >
              <Icon className="h-3 w-3" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
