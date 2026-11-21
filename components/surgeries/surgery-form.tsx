"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { ProceduresMultiSelect } from "@/components/surgeries/procedures-multi-select";

const initialState: SurgeryFormState = {};

type SelectOption = { id: string; name: string };
type PatientOption = { id: string; full_name: string; cpf: string | null };

export function SurgeryForm({
  surgery,
  patients,
  hospitals,
  insuranceProviders,
  procedures,
}: {
  surgery?: Surgery;
  patients: PatientOption[];
  hospitals: SelectOption[];
  insuranceProviders: SelectOption[];
  procedures: SelectOption[];
}) {
  const action = surgery ? updateSurgeryAction.bind(null, surgery.id) : createSurgeryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();

  const [attendanceType, setAttendanceType] = useState<"particular" | "convenio">(
    surgery?.attendance_type ?? "particular"
  );

  const [patientOptions, setPatientOptions] = useState(patients);
  const [patientId, setPatientId] = useState(surgery?.patient_id ?? "");
  const [hospitalOptions, setHospitalOptions] = useState(hospitals);
  const [hospitalId, setHospitalId] = useState(surgery?.hospital_id ?? "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatientOptions(patients);
  }, [patients]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHospitalOptions(hospitals);
  }, [hospitals]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="patient_id">Paciente *</Label>
          <div className="flex gap-2">
            <Select name="patient_id" value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patientOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                    {p.cpf ? ` — ${p.cpf}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PatientFormDialog
              insuranceProviders={insuranceProviders}
              trigger={
                <Button type="button" variant="outline" size="icon" title="Cadastrar novo paciente">
                  <Plus className="h-4 w-4" />
                </Button>
              }
              onCreated={(created) => {
                setPatientOptions((prev) => [...prev, { ...created, cpf: null }]);
                setPatientId(created.id);
                router.refresh();
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hospital_id">Hospital *</Label>
          <div className="flex gap-2">
            <Select name="hospital_id" value={hospitalId} onValueChange={setHospitalId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitalOptions.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <HospitalFormDialog
              trigger={
                <Button type="button" variant="outline" size="icon" title="Cadastrar novo hospital">
                  <Plus className="h-4 w-4" />
                </Button>
              }
              onCreated={(created) => {
                setHospitalOptions((prev) => [...prev, created]);
                setHospitalId(created.id);
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>

      <ProceduresMultiSelect
        procedures={procedures}
        defaultSelected={surgery?.procedures.map((p) => ({ id: p.id, name: p.name, is_primary: p.is_primary }))}
      />

      <div className={attendanceType === "convenio" ? "grid grid-cols-2 gap-3" : ""}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="attendance_type">Tipo de atendimento *</Label>
          <Select
            name="attendance_type"
            value={attendanceType}
            onValueChange={(v) => setAttendanceType(v as "particular" | "convenio")}
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

        {attendanceType === "convenio" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="insurance_provider_id">Operadora *</Label>
            <Select
              name="insurance_provider_id"
              defaultValue={surgery?.insurance_provider_id ?? undefined}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a operadora" />
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
        ) : null}
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
