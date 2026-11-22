"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProcedureMaterialsSheet } from "@/components/procedures/procedure-materials-sheet";

/** Ação destacada "Materiais padrão (N)": abre o painel lateral com o kit do procedimento. */
export function ProcedureMaterialsButton({
  procedure,
  count,
  canEdit,
}: {
  procedure: { id: string; name: string };
  count: number;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Materiais padrão"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
          count > 0
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Package className="h-3.5 w-3.5" />
        {count > 0 ? `${count} ${count === 1 ? "item" : "itens"}` : canEdit ? "Configurar" : "Nenhum"}
      </button>
      <ProcedureMaterialsSheet procedure={procedure} canEdit={canEdit} open={open} onOpenChange={setOpen} />
    </>
  );
}
