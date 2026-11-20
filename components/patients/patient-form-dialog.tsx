"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createPatientAction,
  updatePatientAction,
  type PatientFormState,
} from "@/app/(dashboard)/surgeries/patients/actions";
import type { Patient } from "@/lib/data/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: PatientFormState = {};

export function PatientFormDialog({
  patient,
  insuranceProviders,
}: {
  patient?: Patient;
  insuranceProviders: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const action = patient ? updatePatientAction.bind(null, patient.id) : createPatientAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!pending && !state.error && open) setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={patient ? "outline" : "default"} size={patient ? "sm" : "default"}>
          {patient ? "Editar" : "Novo paciente"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{patient ? "Editar paciente" : "Novo paciente"}</DialogTitle>
          <DialogDescription>
            Um paciente pode ter várias cirurgias ao longo do tempo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Nome completo *</Label>
            <Input id="full_name" name="full_name" defaultValue={patient?.full_name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" defaultValue={patient?.cpf ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birth_date">Data de nascimento</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                defaultValue={patient?.birth_date ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Celular</Label>
              <Input id="phone" name="phone" defaultValue={patient?.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsapp">Telefone de contato</Label>
              <Input id="whatsapp" name="whatsapp" defaultValue={patient?.whatsapp ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={patient?.email ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={patient?.address ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="insurance_provider_id">Operadora de saúde</Label>
            <Select
              name="insurance_provider_id"
              defaultValue={patient?.insurance_provider_id ?? undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Particular / sem operadora" />
              </SelectTrigger>
              <SelectContent>
                {insuranceProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="insurance_card_number">Número da carteirinha</Label>
              <Input
                id="insurance_card_number"
                name="insurance_card_number"
                defaultValue={patient?.insurance_card_number ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="insurance_card_validity">Validade da carteirinha</Label>
              <Input
                id="insurance_card_validity"
                name="insurance_card_validity"
                type="date"
                defaultValue={patient?.insurance_card_validity ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin_notes">Observações administrativas</Label>
            <Textarea id="admin_notes" name="admin_notes" defaultValue={patient?.admin_notes ?? ""} />
          </div>

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
