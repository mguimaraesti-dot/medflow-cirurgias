"use client";

import { ShieldCheck } from "lucide-react";

import type { AuthorizationRequest } from "@/lib/data/operations";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { AuthorizationCard } from "@/components/surgeries/authorization-card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

const STATUS_LABEL: Record<string, string> = {
  not_requested: "Não iniciada",
  sent: "Em andamento",
  in_review: "Em andamento",
  pending_docs: "Pendente",
  approved: "Aprovada",
  partially_approved: "Aprovada",
  denied: "Negada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

const STATUS_TONE: Record<string, RequirementTone> = {
  not_requested: "neutral",
  sent: "info",
  in_review: "info",
  pending_docs: "warning",
  approved: "success",
  partially_approved: "success",
  denied: "danger",
  expired: "danger",
  cancelled: "danger",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function AuthorizationRequirementCard({
  surgeryId,
  insuranceProviderId,
  authorization,
  requirement,
  open,
  onToggle,
}: {
  surgeryId: string;
  insuranceProviderId: string | null;
  authorization: AuthorizationRequest | null;
  requirement: SurgeryRequirement;
  open: boolean;
  onToggle: () => void;
}) {
  const status = authorization?.status ?? "not_requested";
  const tone: RequirementTone = requirement.waived ? "neutral" : STATUS_TONE[status] ?? "neutral";
  const statusLabel = requirement.waived ? "Dispensado" : STATUS_LABEL[status] ?? status;

  const summaryParts = [
    authorization?.protocol_number ? `Protocolo ${authorization.protocol_number}` : null,
    authorization?.sent_at ? `Enviada em ${formatDate(authorization.sent_at)}` : null,
    authorization?.validity_date ? `Válida até ${formatDate(authorization.validity_date)}` : null,
  ].filter(Boolean);

  return (
    <RequirementCardShell
      icon={ShieldCheck}
      title="Autorização"
      tone={tone}
      statusLabel={statusLabel}
      summary={
        summaryParts.length > 0 ? summaryParts.join(" · ") : "Nenhuma solicitação registrada."
      }
      actionLabel={authorization ? "Visualizar / Editar" : "Registrar dados"}
      open={open}
      onToggle={onToggle}
    >
      <AuthorizationCard
        surgeryId={surgeryId}
        insuranceProviderId={insuranceProviderId}
        authorization={authorization}
      />
      <RequirementItem requirement={requirement} />
    </RequirementCardShell>
  );
}
