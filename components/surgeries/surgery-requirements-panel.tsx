"use client";

import { useState } from "react";

import type { AuthorizationRequest, OrReservation, PreoperativeItem } from "@/lib/data/operations";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import type { SurgeryDocument } from "@/lib/data/surgery-documents";
import { AuthorizationRequirementCard } from "@/components/surgeries/authorization-requirement-card";
import { OrReservationRequirementCard } from "@/components/surgeries/or-reservation-requirement-card";
import { PreoperativeRequirementCard } from "@/components/surgeries/preoperative-requirement-card";
import { HospitalRequestCard } from "@/components/surgeries/hospital-request-card";

// "materials" (Materiais/OPME) saiu deste painel por pedido do usuário —
// não aparece mais na ficha da cirurgia, nem é mais criado automaticamente
// pro banco quando uma cirurgia nova é criada (migration 0021). Cirurgias
// antigas que já tinham essa linha preenchida mantêm os dados no banco,
// só não são mais exibidos aqui.
type RequirementKey = SurgeryRequirement["requirement_key"] | "hospital_request";

export function SurgeryRequirementsPanel({
  surgeryId,
  procedureLabel,
  hospitalId,
  insuranceProviderId,
  requirements,
  authorization,
  orReservation,
  preoperativeItems,
  documents,
}: {
  surgeryId: string;
  procedureLabel: string;
  hospitalId: string;
  insuranceProviderId: string | null;
  requirements: SurgeryRequirement[];
  authorization: AuthorizationRequest | null;
  orReservation: OrReservation | null;
  preoperativeItems: PreoperativeItem[];
  documents: SurgeryDocument[];
}) {
  const [openKey, setOpenKey] = useState<RequirementKey | null>(null);

  const byKey = (key: SurgeryRequirement["requirement_key"]) =>
    requirements.find((r) => r.requirement_key === key);
  const toggle = (key: RequirementKey) => setOpenKey((current) => (current === key ? null : key));

  const authorizationReq = byKey("authorization");
  const orReservationReq = byKey("or_reservation");
  const preoperativeReq = byKey("preoperative");

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      <HospitalRequestCard
        surgeryId={surgeryId}
        documents={documents}
        open={openKey === "hospital_request"}
        onToggle={() => toggle("hospital_request")}
      />

      {authorizationReq ? (
        <AuthorizationRequirementCard
          surgeryId={surgeryId}
          procedureLabel={procedureLabel}
          insuranceProviderId={insuranceProviderId}
          authorization={authorization}
          requirement={authorizationReq}
          open={openKey === "authorization"}
          onToggle={() => toggle("authorization")}
        />
      ) : null}

      {orReservationReq ? (
        <OrReservationRequirementCard
          surgeryId={surgeryId}
          hospitalId={hospitalId}
          reservation={orReservation}
          requirement={orReservationReq}
          open={openKey === "or_reservation"}
          onToggle={() => toggle("or_reservation")}
        />
      ) : null}

      {preoperativeReq ? (
        <PreoperativeRequirementCard
          surgeryId={surgeryId}
          items={preoperativeItems}
          requirement={preoperativeReq}
          open={openKey === "preoperative"}
          onToggle={() => toggle("preoperative")}
        />
      ) : null}
    </div>
  );
}
