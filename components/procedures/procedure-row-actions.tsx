"use client";

import Link from "next/link";
import { Package } from "lucide-react";

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
      <Link
        href={`/catalog/procedures/${procedure.id}`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
      >
        <Package className="h-3.5 w-3.5" />
        Materiais padrão
      </Link>
      <ProcedureActiveToggle id={procedure.id} active={procedure.active} />
      <DeleteRowButton
        confirmMessage={`Excluir o procedimento "${procedure.name}"? Essa ação não pode ser desfeita.`}
        onDelete={() => deleteProcedureAction(procedure.id)}
      />
    </div>
  );
}
