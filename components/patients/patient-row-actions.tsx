"use client";

import { deletePatientAction } from "@/app/(dashboard)/surgeries/patients/actions";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function PatientRowActions({
  patient,
}: {
  patient: { id: string; full_name: string };
}) {
  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <DeleteRowButton
        confirmMessage={`Excluir o paciente "${patient.full_name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deletePatientAction(patient.id)}
      />
    </div>
  );
}
