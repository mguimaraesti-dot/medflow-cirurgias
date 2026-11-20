"use client";

import { useActionState, useRef } from "react";
import { toast } from "sonner";

import {
  addDefaultMaterialAction,
  removeDefaultMaterialAction,
  type DefaultMaterialFormState,
} from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: DefaultMaterialFormState = {};

function ItemRow({
  item,
  procedureId,
}: {
  item: ProcedureDefaultMaterial;
  procedureId: string;
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
}: {
  procedureId: string;
  items: ProcedureDefaultMaterial[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
}) {
  const action = addDefaultMaterialAction.bind(null, procedureId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, "Material adicionado ao padrão.");

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum material no kit padrão ainda. Ao criar uma cirurgia com este procedimento, nada
          será sugerido automaticamente até que você cadastre a lista aqui.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} procedureId={procedureId} />
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2">
            <Select name="material_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select name="supplier_id">
            <SelectTrigger>
              <SelectValue placeholder="Fornecedor preferencial" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue={1} />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
          {pending ? "Adicionando..." : "Adicionar ao padrão"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
