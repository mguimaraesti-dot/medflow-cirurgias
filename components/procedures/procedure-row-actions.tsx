"use client";

import { deleteProcedureAction } from "@/app/(dashboard)/catalog/procedures/actions";
import { ProcedureActiveToggle } from "@/components/procedures/procedure-active-toggle";
import { ProcedureMaterialsSheet } from "@/components/procedures/procedure-materials-sheet";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function ProcedureRowActions({
  procedure,
  materials,
  suppliers,
}: {
  procedure: { id: string; name: string; active: boolean };
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <ProcedureMaterialsSheet procedure={procedure} materials={materials} suppliers={suppliers} />
      <ProcedureActiveToggle id={procedure.id} active={procedure.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o procedimento "${procedure.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteProcedureAction(procedure.id)}
      />
    </div>
  );
}
