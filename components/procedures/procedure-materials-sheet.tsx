"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { getKitEditorDataAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { ProcedureKitEditor } from "@/components/procedures/procedure-kit-editor";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Loaded = { items: ProcedureDefaultMaterial[]; suppliers: { id: string; company_name: string }[] };

/** Painel lateral "Materiais padrão". Carrega o kit só ao abrir (a listagem leva apenas a contagem). */
export function ProcedureMaterialsSheet({
  procedure,
  canEdit,
  open,
  onOpenChange,
}: {
  procedure: { id: string; name: string };
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const dirty = useRef(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError(null);
    getKitEditorDataAction(procedure.id).then((res) => {
      if (cancelled) return;
      if ("error" in res) setError(res.error);
      else {
        setData(res);
        setVersion((v) => v + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, procedure.id]);

  function handleOpenChange(next: boolean) {
    if (!next && dirty.current && !window.confirm("Há alterações não salvas nos materiais padrão. Descartar?")) return;
    if (!next) dirty.current = false;
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Materiais padrão — {procedure.name}</SheetTitle>
          <SheetDescription>
            Kit de materiais e OPME que o médico costuma usar neste procedimento. Ao criar uma cirurgia, a lista é
            sugerida e pode ser ajustada para aquela cirurgia.
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : data === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </p>
        ) : (
          <ProcedureKitEditor
            key={version}
            procedureId={procedure.id}
            initialItems={data.items}
            suppliers={data.suppliers}
            canEdit={canEdit}
            onDirtyChange={(d) => {
              dirty.current = d;
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
