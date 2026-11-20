"use client";

import { deleteHospitalAction } from "@/app/(dashboard)/settings/hospitals/actions";
import { HospitalActiveToggle } from "@/components/hospitals/hospital-active-toggle";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function HospitalRowActions({
  hospital,
}: {
  hospital: { id: string; name: string; active: boolean };
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <HospitalActiveToggle id={hospital.id} active={hospital.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o hospital "${hospital.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteHospitalAction(hospital.id)}
      />
    </div>
  );
}
