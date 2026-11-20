"use client";

import { useActionState } from "react";

import {
  createSurgeryAction,
  updateSurgeryAction,
  type SurgeryFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { Surgery } from "@/lib/data/surgeries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: SurgeryFormState = {};

type SelectOption = { id: string; name: string };

export function SurgeryForm({
  surgery,
  patients,
  hospitals,
  insuranceProviders,
  procedures,
}: {
  surgery?: Surgery;
  patients: { id: string; full_name: string; cpf: string | null }[];
  hospitals: SelectOption[];
  insuranceProviders: SelectOption[];
  procedures: SelectOption[];
}) {
  const action = surgery ? updateSurgeryAction.bind(null, surgery.id) : createSurgeryAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="patient_id">Paciente *</Label>
          <Select name="patient_id" defaultValue={surgery?.patient_id} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o paciente" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                  {p.cpf ? ` — ${p.cpf}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hospital_id">Hospital *</Label>
          <Select name="hospital_id" defaultValue={surgery?.hospital_id} required>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o hospital" />
            </SelectTrigger>
            <SelectContent>
              {hospitals.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="primary_procedure_id">Procedimento principal *</Label>
        <Select name="primary_procedure_id" defaultValue={surgery?.primary_procedure_id} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o procedimento" />
          </SelectTrigger>
          <SelectContent>
            {procedures.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendance_type">Tipo de atendimento *</Label>
          <Select
            name="attendance_type"
            defaultValue={surgery?.attendance_type ?? "particular"}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particular">Particular</SelectItem>
              <SelectItem value="convenio">Convênio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_provider_id">Operadora (se convênio)</Label>
          <Select
            name="insurance_provider_id"
            defaultValue={surgery?.insurance_provider_id ?? undefined}
          >
            <SelectTrigger>
              <SelectValue placeholder="Particular / não se aplica" />
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select name="priority" defaultValue={surgery?.priority ?? "normal"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="indication_date">Data da indicação</Label>
          <Input
            id="indication_date"
            name="indication_date"
            type="date"
            defaultValue={surgery?.indication_date ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected_date">Data prevista</Label>
          <Input
            id="expected_date"
            name="expected_date"
            type="date"
            defaultValue={surgery?.expected_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmed_date">Data confirmada</Label>
          <Input
            id="confirmed_date"
            name="confirmed_date"
            type="date"
            defaultValue={surgery?.confirmed_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmed_time">Horário confirmado</Label>
          <Input
            id="confirmed_time"
            name="confirmed_time"
            type="time"
            defaultValue={surgery?.confirmed_time ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin_notes">Observações administrativas</Label>
        <Textarea id="admin_notes" name="admin_notes" defaultValue={surgery?.admin_notes ?? ""} />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : surgery ? "Salvar alterações" : "Criar cirurgia"}
        </Button>
      </div>
    </form>
  );
}
