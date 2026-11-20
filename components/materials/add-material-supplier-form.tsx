"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  addMaterialSupplierAction,
  type MaterialSupplierFormState,
} from "@/app/(dashboard)/catalog/materials/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: MaterialSupplierFormState = {};

export function AddMaterialSupplierForm({
  materialId,
  availableSuppliers,
}: {
  materialId: string;
  availableSuppliers: { id: string; company_name: string }[];
}) {
  const action = addMaterialSupplierAction.bind(null, materialId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  if (availableSuppliers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Todos os fornecedores ativos já estão vinculados a este material (ou não há
        fornecedores ativos cadastrados).
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select name="supplier_id" required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {availableSuppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Vinculando..." : "Vincular"}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <Checkbox name="preferred" value="on" />
        Fornecedor preferencial
      </label>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
