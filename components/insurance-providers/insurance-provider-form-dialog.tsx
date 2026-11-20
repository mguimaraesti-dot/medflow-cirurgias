"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import {
  createInsuranceProviderAction,
  updateInsuranceProviderAction,
  type InsuranceProviderFormState,
} from "@/app/(dashboard)/settings/insurance-providers/actions";
import type { InsuranceProvider } from "@/lib/data/insurance-providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: InsuranceProviderFormState = {};

export function InsuranceProviderFormDialog({
  provider,
  trigger,
}: {
  provider?: InsuranceProvider;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = provider
    ? updateInsuranceProviderAction.bind(null, provider.id)
    : createInsuranceProviderAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending && !state.error && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={provider ? "outline" : "default"} size={provider ? "sm" : "default"}>
            {provider ? "Editar" : "Nova operadora"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? "Editar operadora" : "Nova operadora"}</DialogTitle>
          <DialogDescription>
            {provider
              ? "Usada para vincular autorizações, faturamento e regras de convênio."
              : "O código/identificação é gerado automaticamente ao salvar. Usada para vincular autorizações, faturamento e regras de convênio."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={provider?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={provider?.cnpj ?? ""} />
            </div>
            {provider ? (
              <div className="flex flex-col gap-1.5">
                <Label>Código/identificação</Label>
                <p className="flex h-9 items-center text-sm text-muted-foreground">{provider.code}</p>
                <input type="hidden" name="code" value={provider.code ?? ""} />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={provider?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={provider?.email ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contacts">Contatos</Label>
            <Input id="contacts" name="contacts" defaultValue={provider?.contacts ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avg_authorization_days">Prazo médio de autorização (dias)</Label>
              <Input
                id="avg_authorization_days"
                name="avg_authorization_days"
                type="number"
                min={0}
                defaultValue={provider?.avg_authorization_days ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avg_payment_days">Prazo médio de pagamento (dias)</Label>
              <Input
                id="avg_payment_days"
                name="avg_payment_days"
                type="number"
                min={0}
                defaultValue={provider?.avg_payment_days ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin_rules">Regras administrativas</Label>
            <Textarea id="admin_rules" name="admin_rules" defaultValue={provider?.admin_rules ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="active" value="on" defaultChecked={provider ? provider.active : true} />
            Operadora ativa
          </label>

          {state.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
