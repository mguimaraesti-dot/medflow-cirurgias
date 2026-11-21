"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";

import {
  createSupplierAction,
  updateSupplierAction,
  type SupplierFormState,
} from "@/app/(dashboard)/suppliers/actions";
import type { Supplier } from "@/lib/data/suppliers";
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

const initialState: SupplierFormState = {};

export function SupplierFormDialog({
  supplier,
  trigger,
}: {
  supplier?: Supplier;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = supplier ? updateSupplierAction.bind(null, supplier.id) : createSupplierAction;
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
          <Button variant={supplier ? "outline" : "default"} size={supplier ? "sm" : "default"}>
            {supplier ? "Editar" : "Novo fornecedor"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            Um fornecedor pode estar associado a vários materiais, e vice-versa.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company_name">Razão social *</Label>
              <Input
                id="company_name"
                name="company_name"
                defaultValue={supplier?.company_name}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input id="trade_name" name="trade_name" defaultValue={supplier?.trade_name ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={supplier?.cnpj ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_name">Contato comercial</Label>
              <Input id="contact_name" name="contact_name" defaultValue={supplier?.contact_name ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={supplier?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={supplier?.email ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={supplier?.address ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={supplier?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox name="active" value="on" defaultChecked={supplier ? supplier.active : true} />
            Fornecedor ativo
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
