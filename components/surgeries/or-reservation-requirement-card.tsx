"use client";

import { Building2 } from "lucide-react";

import type { OrReservation } from "@/lib/data/operations";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import { OrReservationCard } from "@/components/surgeries/or-reservation-card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

const STATUS_LABEL: Record<string, string> = {
  not_requested: "Não iniciada",
  requested: "Em andamento",
  awaiting_confirmation: "Em andamento",
  confirmed: "Confirmada",
  rescheduled: "Pendente",
  cancelled: "Cancelada",
};

const STATUS_TONE: Record<string, RequirementTone> = {
  not_requested: "neutral",
  requested: "info",
  awaiting_confirmation: "info",
  confirmed: "success",
  rescheduled: "warning",
  cancelled: "danger",
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export function OrReservationRequirementCard({
  surgeryId,
  hospitalId,
  reservation,
  requirement,
  open,
  onToggle,
}: {
  surgeryId: string;
  hospitalId: string;
  reservation: OrReservation | null;
  requirement: SurgeryRequirement;
  open: boolean;
  onToggle: () => void;
}) {
  const status = reservation?.status ?? "not_requested";
  const tone: RequirementTone = requirement.waived ? "neutral" : STATUS_TONE[status] ?? "neutral";
  const statusLabel = requirement.waived ? "Dispensado" : STATUS_LABEL[status] ?? status;

  const summaryParts = [
    reservation?.room ? `Sala ${reservation.room}` : null,
    reservation?.confirmed_date
      ? `${formatDate(reservation.confirmed_date)}${
          reservation.confirmed_time ? ` às ${reservation.confirmed_time.slice(0, 5)}` : ""
        }`
      : null,
  ].filter(Boolean);

  return (
    <RequirementCardShell
      icon={Building2}
      title="Agendamento"
      tone={tone}
      statusLabel={statusLabel}
      summary={
        summaryParts.length > 0 ? summaryParts.join(" · ") : "Reserva não registrada."
      }
      actionLabel={reservation ? "Atualizar agendamento" : "Registrar agendamento"}
      open={open}
      onToggle={onToggle}
    >
      <OrReservationCard surgeryId={surgeryId} hospitalId={hospitalId} reservation={reservation} />
      <RequirementItem key={`${requirement.id}-${requirement.updated_at}`} requirement={requirement} />
    </RequirementCardShell>
  );
}
