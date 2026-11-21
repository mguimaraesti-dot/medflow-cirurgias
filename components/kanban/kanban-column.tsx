"use client";

import { useDroppable } from "@dnd-kit/core";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { cn } from "@/lib/utils";

// Uma cor de destaque por etapa, pra reforçar visualmente a progressão
// de uma coluna pra outra (a última, "Realizada/Encerrada", fica verde).
const ACCENT_COLORS = [
  "#60A5FA",
  "#3B82F6",
  "#2563EB",
  "#1D4ED8",
  "#1E40AF",
  "#1E3A8A",
  "#0EA5E9",
  "#10B981",
];

export function KanbanColumn({
  stage,
  surgeries,
  openTasksBySurgery,
  index,
  total,
}: {
  stage: WorkflowStage;
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
  index: number;
  total: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const accent =
    index === total - 1
      ? ACCENT_COLORS[ACCENT_COLORS.length - 1]
      : ACCENT_COLORS[index % (ACCENT_COLORS.length - 1)];

  return (
    <div
      className="flex max-h-[calc(100vh-280px)] w-[272px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/60 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">{stage.name}</p>
        <span className="text-xs text-muted-foreground">{surgeries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent"
        )}
      >
        {surgeries.map((surgery) => (
          <KanbanCard
            key={surgery.id}
            surgery={surgery}
            openTasksCount={openTasksBySurgery[surgery.id] ?? 0}
          />
        ))}
        {surgeries.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma cirurgia</p>
        ) : null}
      </div>
    </div>
  );
}
