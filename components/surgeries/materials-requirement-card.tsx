"use client";

import { Package } from "lucide-react";

import type { SurgeryMaterialItem } from "@/lib/data/operations";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { SurgeryMaterialsCard } from "@/components/surgeries/surgery-materials-card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

export function MaterialsRequirementCard({
  surgeryId,
  procedureIds,
  primaryProcedureId,
  items,
  materials,
  suppliers,
  defaultMaterials,
  requirement,
  open,
  onToggle,
}: {
  surgeryId: string;
  procedureIds: string[];
  primaryProcedureId: string;
  items: SurgeryMaterialItem[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  defaultMaterials: ProcedureDefaultMaterial[];
  requirement: SurgeryRequirement;
  open: boolean;
  onToggle: () => void;
}) {
  const total = items.length;
  const ready = items.filter((i) =>
    ["confirmed", "delivered", "used"].includes(i.status)
  ).length;

  let tone: RequirementTone = "neutral";
  let statusLabel = "Não iniciada";
  if (requirement.waived) {
    tone = "neutral";
    statusLabel = "Dispensado";
  } else if (total === 0) {
    tone = "neutral";
    statusLabel = "Não iniciada";
  } else if (ready === total) {
    tone = "success";
    statusLabel = "Completo";
  } else {
    tone = "info";
    statusLabel = "Em andamento";
  }

  return (
    <RequirementCardShell
      icon={Package}
      title="Materiais/OPME"
      tone={tone}
      statusLabel={statusLabel}
      summary={total > 0 ? `${ready} de ${total} itens prontos` : "Nenhum material adicionado ainda."}
      actionLabel={total > 0 ? "Visualizar / Editar" : "Registrar dados"}
      open={open}
      onToggle={onToggle}
    >
      <SurgeryMaterialsCard
        surgeryId={surgeryId}
        procedureIds={procedureIds}
        primaryProcedureId={primaryProcedureId}
        items={items}
        materials={materials}
        suppliers={suppliers}
        defaultMaterials={defaultMaterials}
      />
      <RequirementItem requirement={requirement} />
    </RequirementCardShell>
  );
}
