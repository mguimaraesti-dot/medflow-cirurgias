"use client";

import { useState } from "react";

import type { AuthorizationRequest, OrReservation, PreoperativeItem, SurgeryMaterialItem } from "@/lib/data/operations";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import type { SurgeryRequirement } from "@/lib/data/surgeries";
import type { SurgeryDocument } from "@/lib/data/surgery-documents";
import { AuthorizationRequirementCard } from "@/components/surgeries/authorization-requirement-card";
import { OrReservationRequirementCard } from "@/components/surgeries/or-reservation-requirement-card";
import { PreoperativeRequirementCard } from "@/components/surgeries/preoperative-requirement-card";
import { MaterialsRequirementCard } from "@/components/surgeries/materials-requirement-card";
import { HospitalRequestCard } from "@/components/surgeries/hospital-request-card";

type RequirementKey = SurgeryRequirement["requirement_key"] | "hospital_request";

export function SurgeryRequirementsPanel({
  surgeryId,
  procedureIds,
  primaryProcedureId,
  hospitalId,
  insuranceProviderId,
  requirements,
  authorization,
  orReservation,
  preoperativeItems,
  materialItems,
  materials,
  suppliers,
  defaultMaterials,
  documents,
}: {
  surgeryId: string;
  procedureIds: string[];
  primaryProcedureId: string;
  hospitalId: string;
  insuranceProviderId: string | null;
  requirements: SurgeryRequirement[];
  authorization: AuthorizationRequest | null;
  orReservation: OrReservation | null;
  preoperativeItems: PreoperativeItem[];
  materialItems: SurgeryMaterialItem[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  defaultMaterials: ProcedureDefaultMaterial[];
  documents: SurgeryDocument[];
}) {
  const [openKey, setOpenKey] = useState<RequirementKey | null>(null);

  const byKey = (key: SurgeryRequirement["requirement_key"]) =>
    requirements.find((r) => r.requirement_key === key);
  const toggle = (key: RequirementKey) => setOpenKey((current) => (current === key ? null : key));

  const authorizationReq = byKey("authorization");
  const orReservationReq = byKey("or_reservation");
  const preoperativeReq = byKey("preoperative");
  const materialsReq = byKey("materials");

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
          insuranceProviderId={insuranceProviderId}
          authorization={authorization}
          requirement={authorizationReq}
          open={openKey === "authorization"}
          onToggle={() => toggle("authorization")}
        />
      ) : null}

      {materialsReq ? (
        <MaterialsRequirementCard
          surgeryId={surgeryId}
          procedureIds={procedureIds}
          primaryProcedureId={primaryProcedureId}
          items={materialItems}
          materials={materials}
          suppliers={suppliers}
          defaultMaterials={defaultMaterials}
          requirement={materialsReq}
          open={openKey === "materials"}
          onToggle={() => toggle("materials")}
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
