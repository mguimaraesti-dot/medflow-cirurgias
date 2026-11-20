"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createHospitalAction,
  updateHospitalAction,
  type HospitalFormState,
} from "@/app/(dashboard)/settings/hospitals/actions";
import type { Hospital } from "@/lib/data/hospitals";
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

const initialState: HospitalFormState = {};

export function HospitalFormDialog({ hospital }: { hospital?: Hospital }) {
  const [open, setOpen] = useState(false);
  const action = hospital
    ? updateHospitalAction.bind(null, hospital.id)
    : createHospitalAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!pending && !state.error && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    // Fecha o diálogo automaticamente só depois de um submit bem-sucedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={hospital ? "outline" : "default"} size={hospital ? "sm" : "default"}>
          {hospital ? "Editar" : "Novo hospital"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hospital ? "Editar hospital" : "Novo hospital"}</DialogTitle>
          <DialogDescription>
            Cada cirurgia precisa estar vinculada a um hospital ativo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={hospital?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={hospital?.cnpj ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={hospital?.phone ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={hospital?.address ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin_contact">Contato administrativo</Label>
              <Input
                id="admin_contact"
                name="admin_contact"
                defaultValue={hospital?.admin_contact ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="or_contact">Contato do centro cirúrgico</Label>
              <Input id="or_contact" name="or_contact" defaultValue={hospital?.or_contact ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={hospital?.email ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" name="notes" defaultValue={hospital?.notes ?? ""} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox
              name="active"
              value="on"
              defaultChecked={hospital ? hospital.active : true}
            />
            Hospital ativo
          </label>

          {state.error ? (
            <p className="text-sm text-red-600" role="alert">
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
