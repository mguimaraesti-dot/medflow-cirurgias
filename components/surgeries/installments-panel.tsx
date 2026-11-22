"use client";

import { useActionState, useState } from "react";

import {
  confirmSinglePaymentAction,
  generateInstallmentsAction,
  recordInstallmentPaymentAction,
  type FinancialActionState,
} from "@/app/(dashboard)/surgeries/financial-actions";
import type { Installment } from "@/lib/data/financial";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { todayInSaoPaulo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/currency-input";

const initialState: FinancialActionState = {};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  partially_received: "Parcial",
  received: "Recebida",
  late: "Atrasada",
  cancelled: "Cancelada",
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  open: "outline",
  partially_received: "secondary",
  received: "default",
  late: "destructive",
  cancelled: "outline",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

/** Caso comum: pagamento à vista, sem parcelamento. Confirma o
 * recebimento direto, sem precisar passar por "Gerar parcelas" antes. */
function ConfirmSinglePaymentForm({
  surgeryId,
  financialRecordId,
  defaultAmount,
}: {
  surgeryId: string;
  financialRecordId: string;
  defaultAmount: number | null;
}) {
  const action = confirmSinglePaymentAction.bind(null, surgeryId, financialRecordId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Recebimento confirmado.");

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg bg-muted p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="single_amount">Valor recebido</Label>
        <CurrencyInput id="single_amount" name="amount" defaultValue={defaultAmount} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="single_received_at">Data do recebimento</Label>
        <Input
          id="single_received_at"
          name="received_at"
          type="date"
          defaultValue={todayInSaoPaulo()}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-3" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="h-10 w-full bg-emerald-600 px-6 text-white hover:bg-emerald-700 sm:w-auto"
      >
        {pending ? "Salvando..." : "Confirmar recebimento"}
      </Button>
    </form>
  );
}

function GenerateInstallmentsForm({
  surgeryId,
  financialRecordId,
  defaultAmount,
}: {
  surgeryId: string;
  financialRecordId: string;
  defaultAmount: number | null;
}) {
  const action = generateInstallmentsAction.bind(null, surgeryId, financialRecordId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Parcelas geradas.");

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_8rem_1fr_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="total_amount">Valor total</Label>
        <CurrencyInput id="total_amount" name="total_amount" defaultValue={defaultAmount} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="count">Nº de parcelas</Label>
        <Input id="count" name="count" type="number" min={2} max={60} defaultValue={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="first_due_date">1º vencimento</Label>
        <Input id="first_due_date" name="first_due_date" type="date" />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2 lg:col-span-4" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-10 w-full px-6 sm:col-span-2 lg:col-span-1 lg:w-auto">
        {pending ? "Gerando..." : "Dividir em parcelas"}
      </Button>
    </form>
  );
}

function InstallmentRow({ surgeryId, installment }: { surgeryId: string; installment: Installment }) {
  const [open, setOpen] = useState(false);
  const action = recordInstallmentPaymentAction.bind(null, surgeryId, installment.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Recebimento registrado.");

  const remaining = installment.amount - installment.received_amount;

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-foreground">Parcela {installment.installment_number}</span>
          <span className="ml-2 text-muted-foreground">venc. {formatDate(installment.due_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">
            {formatBRL(installment.received_amount)} / {formatBRL(installment.amount)}
          </span>
          <Badge variant={STATUS_VARIANT[installment.status]}>{STATUS_LABEL[installment.status]}</Badge>
          {installment.status !== "received" && installment.status !== "cancelled" ? (
            <Button type="button" variant="outline" className="h-9 px-4" onClick={() => setOpen((v) => !v)}>
              Receber
            </Button>
          ) : null}
        </div>
      </div>
      {open ? (
        <form
          action={formAction}
          className="grid grid-cols-1 gap-2 rounded-md bg-muted p-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={`amount-${installment.id}`} className="text-xs">
              Valor recebido
            </Label>
            <CurrencyInput id={`amount-${installment.id}`} name="amount" defaultValue={remaining} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`received_at-${installment.id}`} className="text-xs">
              Data
            </Label>
            <Input
              id={`received_at-${installment.id}`}
              name="received_at"
              type="date"
              defaultValue={todayInSaoPaulo()}
              className="h-9"
            />
          </div>
          {state.error ? (
            <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-3" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={pending}
            className="h-9 w-full bg-emerald-600 px-5 text-white hover:bg-emerald-700 sm:w-auto"
          >
            {pending ? "Salvando..." : "Confirmar"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export function InstallmentsPanel({
  surgeryId,
  financialRecordId,
  agreedValue,
  installments,
}: {
  surgeryId: string;
  financialRecordId: string;
  agreedValue: number | null;
  installments: Installment[];
}) {
  const [splitOpen, setSplitOpen] = useState(false);

  // Caso mais comum: nenhuma parcela ainda — pagamento é à vista na
  // grande maioria dos casos, então o destaque vai pra confirmação
  // direta; "dividir em parcelas" fica como opção secundária, escondida
  // atrás de um link, só pra quem realmente for parcelar.
  if (installments.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <ConfirmSinglePaymentForm
          surgeryId={surgeryId}
          financialRecordId={financialRecordId}
          defaultAmount={agreedValue}
        />
        {splitOpen ? (
          <GenerateInstallmentsForm
            surgeryId={surgeryId}
            financialRecordId={financialRecordId}
            defaultAmount={agreedValue}
          />
        ) : (
          <button
            type="button"
            onClick={() => setSplitOpen(true)}
            className="self-start py-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Em vez disso, dividir esse valor em parcelas
          </button>
        )}
      </div>
    );
  }

  const totalReceived = installments.reduce((sum, i) => sum + i.received_amount, 0);
  const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalAmount - totalReceived;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 rounded-lg bg-muted px-3 py-2 text-sm">
        <span>
          Total: <span className="font-medium text-foreground">{formatBRL(totalAmount)}</span>
        </span>
        <span>
          Recebido: <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatBRL(totalReceived)}</span>
        </span>
        <span>
          Saldo: <span className="font-medium text-foreground">{formatBRL(balance)}</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {installments.map((installment) => (
          <InstallmentRow key={installment.id} surgeryId={surgeryId} installment={installment} />
        ))}
      </ul>
      {installments.length === 1 && totalReceived === 0 ? (
        <GenerateInstallmentsForm
          surgeryId={surgeryId}
          financialRecordId={financialRecordId}
          defaultAmount={totalAmount}
        />
      ) : null}
    </div>
  );
}
