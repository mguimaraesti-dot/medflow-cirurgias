"use client";

import { deleteProcedureAction } from "@/app/(dashboard)/catalog/procedures/actions";
import { ProcedureActiveToggle } from "@/components/procedures/procedure-active-toggle";
import { DeleteRowButton } from "@/components/shared/delete-row-button";

export function ProcedureRowActions({
  procedure,
}: {
  procedure: { id: string; name: string; active: boolean };
}) {
  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <ProcedureActiveToggle id={procedure.id} active={procedure.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o procedimento "${procedure.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteProcedureAction(procedure.id)}
      />
    </div>
  );
}
