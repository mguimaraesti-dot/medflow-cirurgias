"use client";

import { useActionState, useRef } from "react";

import {
  addProtocolItemAction,
  type ProtocolItemFormState,
} from "@/app/(dashboard)/protocols/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: ProtocolItemFormState = {};

export function ProtocolItemForm({
  versionId,
  protocolId,
  materials,
  suppliers,
}: {
  versionId: string;
  protocolId: string;
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
}) {
  const action = addProtocolItemAction.bind(null, versionId, protocolId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 border-t border-slate-100 pt-4"
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
        <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue={1} placeholder="Qtd." />
        <Input name="unit" placeholder="Unidade" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select name="preferred_supplier_id">
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
        <Input name="specs" placeholder="Especificações" />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
        {pending ? "Adicionando..." : "Adicionar item"}
      </Button>
    </form>
  );
}
