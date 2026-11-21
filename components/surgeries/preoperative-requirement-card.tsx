"use client";

import { ClipboardList } from "lucide-react";

import type { PreoperativeItem } from "@/lib/data/operations";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { PreoperativeCard } from "@/components/surgeries/preoperative-card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

export function PreoperativeRequirementCard({
  surgeryId,
  items,
  requirement,
  open,
  onToggle,
}: {
  surgeryId: string;
  items: PreoperativeItem[];
  requirement: SurgeryRequirement;
  open: boolean;
  onToggle: () => void;
}) {
  const total = items.length;
  const done = items.filter((i) => i.status === "done" || i.status === "waived").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = items.some((i) => i.status === "pending" && i.due_date && i.due_date < today);

  let tone: RequirementTone = "neutral";
  let statusLabel = "Não iniciada";
  if (requirement.waived) {
    tone = "neutral";
    statusLabel = "Dispensado";
  } else if (total === 0) {
    tone = "neutral";
    statusLabel = "Não iniciada";
  } else if (done === total) {
    tone = "success";
    statusLabel = "Completo";
  } else if (overdue) {
    tone = "warning";
    statusLabel = "Atrasado";
  } else {
    tone = "info";
    statusLabel = "Em andamento";
  }

  return (
    <RequirementCardShell
      icon={ClipboardList}
      title="Pré-operatório"
      tone={tone}
      statusLabel={statusLabel}
      summary={total > 0 ? `${done} de ${total} itens concluídos` : "Nenhum item cadastrado ainda."}
      actionLabel={total > 0 ? "Visualizar / Editar" : "Registrar dados"}
      open={open}
      onToggle={onToggle}
    >
      <PreoperativeCard surgeryId={surgeryId} items={items} />
      <RequirementItem key={`${requirement.id}-${requirement.updated_at}`} requirement={requirement} />
    </RequirementCardShell>
  );
}
