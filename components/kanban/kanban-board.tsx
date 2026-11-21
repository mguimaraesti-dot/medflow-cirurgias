"use client";

import { useEffect, useState, useTransition } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { moveSurgeryStageAction } from "@/app/(dashboard)/surgeries/actions";
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

    const surgeryId = String(active.id);
    const stageId = String(over.id);
    const current = items.find((s) => s.id === surgeryId);
    if (!current || current.stage_id === stageId) return;

    setItems((prev) =>
      prev.map((s) => (s.id === surgeryId ? { ...s, stage_id: stageId } : s))
    );
    startTransition(() => {
      moveSurgeryStageAction(surgeryId, stageId);
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
            surgeries={items.filter((s) => s.stage_id === stage.id)}
            openTasksBySurgery={openTasksBySurgery}
            index={index}
            total={stages.length}
          />
        ))}
      </div>
    </DndContext>
  );
}
