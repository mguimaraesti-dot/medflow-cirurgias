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

  useEffect(() => {
    // Resincroniza com os dados do servidor após a revalidação disparada
    // pela server action (ex: outra aba moveu o cartão, ou o refresh trouxe
    // uma cirurgia nova).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(surgeries);
  }, [surgeries]);

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
            surgeries={items
              .filter((s) => s.stage_id === stage.id)
              .sort((a, b) => a.board_position - b.board_position)}
            openTasksBySurgery={openTasksBySurgery}
            index={index}
            total={stages.length}
          />
        ))}
      </div>
    </DndContext>
  );
}
