"use client";

import { ClipboardList } from "lucide-react";

import type { PreoperativeItem } from "@/lib/data/operations";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { PreoperativeCard } from "@/components/surgeries/preoperative-card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

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
  // No máximo 1 item: a avaliação pré-anestésica (ver preoperative-card.tsx).
  const item = items[0] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = item?.status === "pending" && !!item.due_date && item.due_date < today;

  let tone: RequirementTone = "neutral";
  let statusLabel = "Não avaliado";
  let summary = "Ainda não foi avaliado se a cirurgia precisa de consulta pré-anestésica.";

  if (requirement.waived) {
    tone = "neutral";
    statusLabel = "Dispensado";
    summary = "Requisito dispensado manualmente.";
  } else if (!item) {
    // mantém os valores padrão acima
  } else if (item.status === "waived") {
    tone = "success";
    statusLabel = "Não necessária";
    summary = "Avaliado: a cirurgia não precisa de consulta pré-anestésica.";
  } else if (item.status === "done") {
    tone = "success";
    statusLabel = "Realizada";
    summary = item.due_date
      ? `Consulta pré-anestésica realizada em ${formatDate(item.due_date)}.`
      : "Consulta pré-anestésica realizada.";
  } else if (overdue) {
    tone = "warning";
    statusLabel = "Atrasada";
    summary = `Consulta pré-anestésica necessária — data prevista (${formatDate(item.due_date as string)}) já passou.`;
  } else if (item.due_date) {
    tone = "info";
    statusLabel = "Agendada";
    summary = `Consulta pré-anestésica necessária, agendada para ${formatDate(item.due_date)}.`;
  } else {
    tone = "info";
    statusLabel = "Pendente";
    summary = "Consulta pré-anestésica necessária, ainda sem data marcada.";
  }

  return (
    <RequirementCardShell
      icon={ClipboardList}
      title="Pré-operatório"
      tone={tone}
      statusLabel={statusLabel}
      summary={summary}
      actionLabel={item ? "Visualizar / Editar" : "Registrar dados"}
      open={open}
      onToggle={onToggle}
    >
      <PreoperativeCard surgeryId={surgeryId} items={items} />
      <RequirementItem key={`${requirement.id}-${requirement.updated_at}`} requirement={requirement} />
    </RequirementCardShell>
  );
}
