"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { getDefaultMaterialsAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { ProcedureDefaultMaterialsCard } from "@/components/procedures/procedure-default-materials-card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

export function ProcedureMaterialsSheet({
  procedure,
  materials,
  suppliers,
}: {
  procedure: { id: string; name: string };
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ProcedureDefaultMaterial[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      try {
        const data = await getDefaultMaterialsAction(procedure.id);
        setItems(data);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <Package className="h-3.5 w-3.5" />
          Materiais padrão
        </button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Materiais padrão — {procedure.name}</SheetTitle>
          <SheetDescription>
            Lista de materiais que o médico costuma usar neste procedimento. Ao criar uma cirurgia,
            essa lista é sugerida automaticamente — e pode ser atualizada depois de cada cirurgia,
            se o que for usado for diferente.
          </SheetDescription>
        </SheetHeader>

        {loading || items === null ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <ProcedureDefaultMaterialsCard
            procedureId={procedure.id}
            items={items}
            materials={materials}
            suppliers={suppliers}
            onItemsChange={setItems}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
