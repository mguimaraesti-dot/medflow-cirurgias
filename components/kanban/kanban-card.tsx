"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ListChecks, PackageCheck, PackageX, Clock } from "lucide-react";

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
  normal: "bg-muted text-muted-foreground border-border",
  high: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  urgent: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function materialsStatus(requirements: SurgeryListItem["requirements"]) {
  const materials = requirements.find((r) => r.requirement_key === "materials");
  if (!materials || materials.waived) return null;
  if (materials.is_satisfied) {
    return { label: "Materiais OK", icon: PackageCheck, className: "text-emerald-600 dark:text-emerald-400" };
  }
  return { label: "Materiais pendentes", icon: PackageX, className: "text-red-600 dark:text-red-400" };
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

  const materials = materialsStatus(surgery.requirements);
  const attendanceLabel =
    surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio";

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
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{surgery.code}</span>
        <Badge className={cn("border", PRIORITY_CLASS[surgery.priority])} variant="outline">
          {PRIORITY_LABEL[surgery.priority]}
        </Badge>
      </div>
      <p className="mt-1 truncate text-foreground">{surgery.patient?.full_name ?? "—"}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {surgery.hospital?.name ?? "—"} · {surgery.primary_procedure?.name ?? "—"}
        {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{attendanceLabel}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {date ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {date}
          </span>
        ) : null}
        {materials ? (
          <span className={cn("flex items-center gap-1 text-xs", materials.className)}>
            <materials.icon className="h-3 w-3" />
            {materials.label}
          </span>
        ) : null}
        {openTasksCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <ListChecks className="h-3 w-3" />
            {openTasksCount} pendência{openTasksCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
