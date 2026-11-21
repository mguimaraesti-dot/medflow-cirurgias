"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { moveSurgeryCardAction } from "@/app/(dashboard)/surgeries/actions";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { getStageColor } from "@/components/kanban/stage-palette";
import { cn } from "@/lib/utils";

/** As 8 colunas lado a lado não cabem numa tela de celular — abaixo de
 * `md` o board mostra uma etapa por vez, selecionada por abas. O valor
 * em px bate com o breakpoint `md` do Tailwind (768px). */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function KanbanBoard({
  stages,
  surgeries,
  openTasksBySurgery,
}: {
  stages: WorkflowStage[];
  surgeries: SurgeryListItem[];
  openTasksBySurgery: Record<string, number>;
}) {
  const [items, setItems] = useState(surgeries);
  const [, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [activeStageId, setActiveStageId] = useState<string | null>(null);

  useEffect(() => {
    // Resincroniza com os dados do servidor após a revalidação disparada
    // pela server action (ex: outra aba moveu o cartão, ou o refresh trouxe
    // uma cirurgia nova).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(surgeries);
  }, [surgeries]);

  useEffect(() => {
    // Garante que sempre haja uma aba ativa válida (primeira renderização,
    // ou se a etapa selecionada deixou de existir por algum motivo).
    if (!activeStageId || !stages.some((s) => s.id === activeStageId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStageId(stages[0]?.id ?? null);
    }
  }, [stages, activeStageId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeItem = items.find((s) => s.id === activeId);
    if (!activeItem) return;

    // Se soltou em cima de outro card, a etapa de destino é a etapa
    // desse card; se soltou na área vazia da coluna (ou abaixo do
    // último card), overId já é o id da própria etapa.
    const overItem = items.find((s) => s.id === overId);
    const targetStageId = overItem ? overItem.stage_id : overId;

    const targetColumnItems = items
      .filter((s) => s.stage_id === targetStageId && s.id !== activeId)
      .sort((a, b) => a.board_position - b.board_position);

    const overIndex = overItem ? targetColumnItems.findIndex((s) => s.id === overId) : -1;
    const newIndex = overIndex === -1 ? targetColumnItems.length : overIndex;

    const before = targetColumnItems[newIndex - 1];
    const after = targetColumnItems[newIndex];
    let boardPosition: number;
    if (!before && !after) boardPosition = Date.now();
    else if (!before) boardPosition = after.board_position - 1000;
    else if (!after) boardPosition = before.board_position + 1000;
    else boardPosition = (before.board_position + after.board_position) / 2;

    if (activeItem.stage_id === targetStageId && activeItem.board_position === boardPosition) return;

    setItems((prev) =>
      prev.map((s) =>
        s.id === activeId ? { ...s, stage_id: targetStageId, board_position: boardPosition } : s
      )
    );
    startTransition(() => {
      moveSurgeryCardAction(activeId, targetStageId, boardPosition);
    });
  }

  function surgeriesForStage(stageId: string) {
    return items.filter((s) => s.stage_id === stageId).sort((a, b) => a.board_position - b.board_position);
  }

  if (isMobile) {
    const activeIndex = Math.max(0, stages.findIndex((s) => s.id === activeStageId));
    const activeStage = stages[activeIndex];

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2">
          {stages.map((stage, index) => {
            const accent = getStageColor(index, stages.length);
            const active = stage.id === activeStage?.id;
            const count = surgeriesForStage(stage.id).length;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStageId(stage.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "border-transparent text-white" : "border-border bg-card text-muted-foreground"
                )}
                style={active ? { backgroundColor: accent } : undefined}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                  style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : accent }}
                >
                  {index + 1}
                </span>
                {stage.name}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px]",
                    active ? "bg-white/25" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {activeStage ? (
          <KanbanColumn
            key={activeStage.id}
            stage={activeStage}
            stages={stages}
            surgeries={surgeriesForStage(activeStage.id)}
            openTasksBySurgery={openTasksBySurgery}
            index={activeIndex}
            total={stages.length}
            mobileFull
          />
        ) : null}
      </DndContext>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {/* items-start: cada coluna só cresce até a altura do seu próprio
       * conteúdo (uma coluna vazia não fica esticada pra igualar a mais
       * alta). flex-1 min-w-0 em cada coluna (ver kanban-column.tsx): as
       * 8 colunas sempre cabem lado a lado, encolhendo em telas menores,
       * sem rolagem horizontal nem quebra de linha. */}
      <div className="flex items-start gap-3 pb-4">
        {stages.map((stage, index) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            surgeries={surgeriesForStage(stage.id)}
            openTasksBySurgery={openTasksBySurgery}
            index={index}
            total={stages.length}
          />
        ))}
      </div>
    </DndContext>
  );
}
