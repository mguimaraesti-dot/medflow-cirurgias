"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addDefaultMaterialAction,
  removeDefaultMaterialAction,
  getDefaultMaterialsAction,
  type DefaultMaterialFormState,
} from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { Plus } from "lucide-react";

const initialState: DefaultMaterialFormState = {};

function ItemRow({
  item,
  procedureId,
  onRemoved,
}: {
  item: ProcedureDefaultMaterial;
  procedureId: string;
  onRemoved?: () => void | Promise<void>;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">
          {item.material?.name ?? "Material removido"}{" "}
          <span className="text-muted-foreground">× {item.quantity}</span>
        </p>
        {item.preferred_supplier ? (
          <p className="text-xs text-muted-foreground">
            Fornecedor preferencial: {item.preferred_supplier.company_name}
          </p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await removeDefaultMaterialAction(item.id, procedureId);
          toast.success("Material removido do padrão.");
          await onRemoved?.();
        }}
      >
        Remover
      </Button>
    </li>
  );
}

export function ProcedureDefaultMaterialsCard({
  procedureId,
  items,
  materials,
  suppliers,
  onItemsChange,
}: {
  procedureId: string;
  items: ProcedureDefaultMaterial[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  /** Quando informado (uso no painel lateral de Procedimentos), é chamado
   * após adicionar/remover um item, pra buscar a lista atualizada — no
   * lugar de depender do re-render do Server Component da página. */
  onItemsChange?: (items: ProcedureDefaultMaterial[]) => void;
}) {
  const action = addDefaultMaterialAction.bind(null, procedureId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useActionToast(state, "Material adicionado ao padrão.");

  async function refetchItems() {
    if (!onItemsChange) return;
    const updated = await getDefaultMaterialsAction(procedureId);
    onItemsChange(updated);
  }

  const [materialOptions, setMaterialOptions] = useState(materials);
  const [materialId, setMaterialId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // Mantém a lista em dia caso a página seja atualizada pelo servidor, e
  // limpa a seleção depois de um envio concluído (sucesso ou erro).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaterialOptions(materials);
  }, [materials]);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!pending && !state.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaterialId("");
      setSupplierId("");
      void refetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Itens do kit {items.length > 0 ? `(${items.length})` : ""}
        </h3>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            Nenhum material no kit padrão ainda. Ao criar uma cirurgia com este procedimento, nada
            será sugerido automaticamente até que você cadastre a lista aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} procedureId={procedureId} onRemoved={refetchItems} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-medium text-foreground">Adicionar material</h3>
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label>Material *</Label>
            <div className="flex gap-2">
              <Select name="material_id" required value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o material" />
                </SelectTrigger>
                <SelectContent>
                  {materialOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MaterialFormDialog
                trigger={
                  <Button type="button" variant="outline" size="icon" title="Cadastrar novo material">
                    <Plus className="h-4 w-4" />
                  </Button>
                }
                onCreated={(created) => {
                  setMaterialOptions((prev) => [...prev, created]);
                  setMaterialId(created.id);
                  router.refresh();
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Fornecedor preferencial</Label>
              <Select name="supplier_id" value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="default-material-quantity">Quantidade</Label>
              <Input
                id="default-material-quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={1}
              />
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Adicionando..." : "Adicionar ao padrão"}
          </Button>
        </form>
      </div>
    </div>
  );
}
