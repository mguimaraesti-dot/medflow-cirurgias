"use client";

import { useActionState } from "react";

import {
  saveConvenioValuesAction,
  type FinancialActionState,
} from "@/app/(dashboard)/surgeries/financial-actions";
import type { FinancialRecord } from "@/lib/data/financial";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared/currency-input";

const initialState: FinancialActionState = {};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  bank_transfer: "Transferência bancária",
  other: "Outro",
};

export function ConvenioValuesForm({
  surgeryId,
  record,
}: {
  surgeryId: string;
  record: FinancialRecord;
}) {
  const action = saveConvenioValuesAction.bind(null, surgeryId, record.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Valores salvos.");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected_value">Valor previsto</Label>
          <CurrencyInput id="expected_value" name="expected_value" defaultValue={record.expected_value} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="authorized_value">Valor autorizado</Label>
          <CurrencyInput id="authorized_value" name="authorized_value" defaultValue={record.authorized_value} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discount_value">Desconto</Label>
          <CurrencyInput id="discount_value" name="discount_value" defaultValue={record.discount_value} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adjusted_value">Valor ajustado</Label>
          <CurrencyInput id="adjusted_value" name="adjusted_value" defaultValue={record.adjusted_value} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5 md:w-60">
        <Label htmlFor="payment_method">Forma de pagamento</Label>
        <select
          id="payment_method"
          name="payment_method"
          defaultValue={record.payment_method ?? ""}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">—</option>
          {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="convenio_notes">Observações financeiras</Label>
        <Textarea id="convenio_notes" name="notes" defaultValue={record.notes ?? ""} />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
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
