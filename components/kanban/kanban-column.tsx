"use client";

import { useDroppable } from "@dnd-kit/core";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  stage,
  surgeries,
  openTasksBySurgery,
}: {
  stage: WorkflowStage;
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex min-w-0 flex-col rounded-xl bg-muted/50">
      <div className="flex items-center justify-between px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">{stage.name}</p>
        <span className="text-xs text-muted-foreground">{surgeries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl p-2 pt-0 transition-colors",
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
