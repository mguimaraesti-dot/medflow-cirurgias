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
  low: "bg-slate-100 text-slate-600 border-slate-200",
  normal: "bg-slate-100 text-slate-600 border-slate-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function materialsStatus(requirements: SurgeryListItem["requirements"]) {
  const materials = requirements.find((r) => r.requirement_key === "materials");
  if (!materials || materials.waived) return null;
  if (materials.is_satisfied) {
    return { label: "Materiais OK", icon: PackageCheck, className: "text-emerald-600" };
  }
  return { label: "Materiais pendentes", icon: PackageX, className: "text-red-600" };
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
        "cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-slate-300 active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-900">{surgery.code}</span>
        <Badge className={cn("border", PRIORITY_CLASS[surgery.priority])} variant="outline">
          {PRIORITY_LABEL[surgery.priority]}
        </Badge>
      </div>
      <p className="mt-1 truncate text-slate-700">{surgery.patient?.full_name ?? "—"}</p>
      <p className="mt-0.5 truncate text-xs text-slate-500">
        {surgery.hospital?.name ?? "—"} · {surgery.primary_procedure?.name ?? "—"}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-400">{attendanceLabel}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {date ? (
          <span className="flex items-center gap-1 text-xs text-slate-400">
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
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <ListChecks className="h-3 w-3" />
            {openTasksCount} pendência{openTasksCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
