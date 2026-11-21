"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { getStageColor } from "@/components/kanban/stage-palette";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  stage,
  stages,
  surgeries,
  openTasksBySurgery,
  index,
  total,
  /** No modo "uma etapa por vez" do mobile (ver kanban-board.tsx), a
   * coluna é a única coisa na tela — ocupa a largura toda e ganha mais
   * altura, em vez de encolher pra caber ao lado de outras 7 colunas. */
  mobileFull = false,
}: {
  stage: WorkflowStage;
  stages: WorkflowStage[];
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
  index: number;
  total: number;
  mobileFull?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const accent = getStageColor(index, total);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        mobileFull ? "max-h-[calc(100vh-340px)] w-full" : "max-h-[calc(100vh-280px)] min-w-0 flex-1"
      )}
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-1.5 border-b border-border bg-muted/60 px-2.5 py-2"
        title={stage.name}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            {index + 1}
          </span>
          <p className="line-clamp-2 text-xs font-medium leading-tight text-foreground break-words">
            {stage.name}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {surgeries.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent"
        )}
      >
        <SortableContext items={surgeries.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {surgeries.map((surgery) => (
            <KanbanCard
              key={surgery.id}
              surgery={surgery}
              stages={stages}
              openTasksCount={openTasksBySurgery[surgery.id] ?? 0}
            />
          ))}
        </SortableContext>
        {surgeries.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma cirurgia</p>
        ) : null}
      </div>
    </div>
  );
}
