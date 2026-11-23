"use client";

import { useActionState, useState } from "react";

import { saveAiCreditSettingsAction, type AiCreditFormState } from "@/app/(dashboard)/settings/ai-credit-actions";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: AiCreditFormState = {};

export function AiCreditForm({
  defaults,
  startOpen,
}: {
  defaults: { credit_usd: number | null; credit_since: string; low_balance_usd: number };
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [state, formAction, pending] = useActionState(saveAiCreditSettingsAction, initial);
  useActionToast(state, "Saldo da IA atualizado.");

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="h-8 w-fit" onClick={() => setOpen(true)}>
        Registrar recarga
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="credit_usd">Crédito comprado (US$)</Label>
        <Input id="credit_usd" name="credit_usd" inputMode="decimal" placeholder="20,00" defaultValue={defaults.credit_usd ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="credit_since">Data da recarga</Label>
        <Input id="credit_since" name="credit_since" type="date" defaultValue={defaults.credit_since} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="low_balance_usd">Avisar abaixo de (US$)</Label>
        <Input id="low_balance_usd" name="low_balance_usd" inputMode="decimal" defaultValue={defaults.low_balance_usd} />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-3">
        Use o valor da recarga mais recente e a data em que ela entrou. Se ainda havia saldo da recarga anterior, some-o ao valor. O gasto é contado a partir desta data.
      </p>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-3" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2 sm:col-span-3 sm:justify-end">
        {!startOpen ? (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
