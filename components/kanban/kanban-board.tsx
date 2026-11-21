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

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { moveSurgeryCardAction } from "@/app/(dashboard)/surgeries/actions";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { getStageColor } from "@/components/kanban/stage-palette";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-is-mobile";

function StageOptionLabel({
  name,
  count,
  colorIndex,
  total,
}: {
  name: string;
  count: number;
  colorIndex: number;
  total: number;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
        style={{ backgroundColor: getStageColor(colorIndex, total) }}
      >
        {colorIndex + 1}
      </span>
      <span className="min-w-0 truncate">{name}</span>
      <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
        {count}
      </span>
    </span>
  );
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
        {/*
          Antes era uma faixa de abas rolando de lado — dava pra ver só um
          pedaço de cada etapa, cortada no meio da palavra, sem indicação
          clara de que dava pra rolar mais. Um seletor (dropdown) mostra o
          nome inteiro da etapa atual e lista todas de uma vez ao abrir;
          as setas do lado permitem avançar/voltar sem precisar abri-lo.
        */}
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => activeIndex > 0 && setActiveStageId(stages[activeIndex - 1].id)}
            disabled={activeIndex === 0}
            aria-label="Etapa anterior"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Select value={activeStage?.id} onValueChange={setActiveStageId}>
            <SelectTrigger className="flex-1 text-sm font-medium text-foreground">
              <SelectValue>
                {activeStage ? (
                  <StageOptionLabel
                    name={activeStage.name}
                    count={surgeriesForStage(activeStage.id).length}
                    colorIndex={activeIndex}
                    total={stages.length}
                  />
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage, index) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <StageOptionLabel
                    name={stage.name}
                    count={surgeriesForStage(stage.id).length}
                    colorIndex={index}
                    total={stages.length}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => activeIndex < stages.length - 1 && setActiveStageId(stages[activeIndex + 1].id)}
            disabled={activeIndex === stages.length - 1}
            aria-label="Próxima etapa"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
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
