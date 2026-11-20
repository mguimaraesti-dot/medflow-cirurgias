"use client";

import { useActionState } from "react";

import {
  saveParticularFinancialAction,
  type FinancialFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { ParticularFinancialRecord } from "@/lib/data/surgeries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FinancialFormState = {};

export function FinancialForm({
  surgeryId,
  record,
}: {
  surgeryId: string;
  record: ParticularFinancialRecord | null;
}) {
  const action = saveParticularFinancialAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected_value">Valor previsto (R$)</Label>
          <Input
            id="expected_value"
            name="expected_value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={record?.expected_value ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agreed_value">Valor acordado (R$)</Label>
          <Input
            id="agreed_value"
            name="agreed_value"
            type="number"
            step="0.01"
            min="0"
            defaultValue={record?.agreed_value ?? ""}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observações financeiras</Label>
        <Textarea id="notes" name="notes" defaultValue={record?.notes ?? ""} />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar valores"}
        </Button>
      </div>
    </form>
  );
}
