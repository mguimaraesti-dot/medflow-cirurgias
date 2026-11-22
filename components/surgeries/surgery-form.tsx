"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Check,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  HeartHandshake,
  Plus,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  createSurgeryAction,
  updateSurgeryAction,
  type SurgeryFormState,
} from "@/app/(dashboard)/surgeries/actions";
import type { Surgery } from "@/lib/data/surgeries";
import { ADMIN_NOTES_MAX } from "@/lib/validation/surgeries";
import { cn, todayInSaoPaulo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import {
  ProceduresMultiSelect,
  type ProcedureOption,
  type SelectedProcedure,
} from "@/components/surgeries/procedures-multi-select";
import { SearchSelect } from "@/components/surgeries/search-select";

const initialState: SurgeryFormState = {};

type SelectOption = { id: string; name: string };
type PatientOption = { id: string; full_name: string; cpf: string | null };
type Priority = "low" | "normal" | "high" | "urgent";
type Attendance = "particular" | "convenio";

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Baixa", dot: "bg-slate-400" },
  { value: "normal", label: "Normal", dot: "bg-emerald-500" },
  { value: "high", label: "Alta", dot: "bg-amber-500" },
  { value: "urgent", label: "Urgente", dot: "bg-red-500" },
];

type FormValues = {
  patientId: string;
  hospitalId: string;
  procedures: SelectedProcedure[];
  attendanceType: Attendance;
  insuranceProviderId: string;
  priority: Priority;
  indicationDate: string;
  expectedDate: string;
  confirmedDate: string;
  confirmedTime: string;
  notes: string;
};

type Errors = Partial<Record<keyof FormValues, string>>;

function SectionTitle({ icon, children, htmlFor }: { icon: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      {children}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  );
}

function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function SummaryRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-border/60 py-3 last:border-0">
      <span className="mt-0.5 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

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
  procedures: ProcedureOption[];
}) {
  const action = surgery ? updateSurgeryAction.bind(null, surgery.id) : createSurgeryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const initial: FormValues = useMemo(
    () => ({
      patientId: surgery?.patient_id ?? "",
      hospitalId: surgery?.hospital_id ?? "",
      procedures: surgery?.procedures.map((p) => ({ id: p.id, is_primary: p.is_primary })) ?? [],
      attendanceType: surgery?.attendance_type ?? "particular",
      insuranceProviderId: surgery?.insurance_provider_id ?? "",
      priority: (surgery?.priority as Priority | undefined) ?? "normal",
      indicationDate: surgery?.indication_date ?? todayInSaoPaulo(),
      expectedDate: surgery?.expected_date ?? "",
      confirmedDate: surgery?.confirmed_date ?? "",
      confirmedTime: surgery?.confirmed_time ?? "",
      notes: surgery?.admin_notes ?? "",
    }),
    [surgery]
  );

  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [patientOptions, setPatientOptions] = useState(patients);
  const [hospitalOptions, setHospitalOptions] = useState(hospitals);
  const [confirmDialog, setConfirmDialog] = useState<"clear" | "cancel" | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatientOptions(patients);
  }, [patients]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHospitalOptions(hospitals);
  }, [hospitals]);

  // Falha vinda do servidor: avisa também por toast (o texto fica no formulário).
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  // Procedimentos já vinculados à cirurgia podem ter sido desativados depois:
  // mantém-nos na lista pra continuarem aparecendo (com nome) na edição.
  const procedureOptions = useMemo(() => {
    const known = new Set(procedures.map((p) => p.id));
    const extra = (surgery?.procedures ?? [])
      .filter((p) => !known.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, tuss_code: null }));
    return [...procedures, ...extra];
  }, [procedures, surgery]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  function validate(v: FormValues): Errors {
    const e: Errors = {};
    if (!v.patientId) e.patientId = "Selecione o paciente.";
    if (!v.hospitalId) e.hospitalId = "Selecione o hospital.";
    if (v.procedures.length === 0) e.procedures = "Selecione ao menos um procedimento.";
    if (v.attendanceType === "convenio" && !v.insuranceProviderId) {
      e.insuranceProviderId = "Selecione a operadora do convênio.";
    }
    if (v.confirmedTime && !v.confirmedDate) {
      e.confirmedTime = "Informe a data confirmada para usar o horário.";
    }
    if (v.confirmedDate && v.indicationDate && v.confirmedDate < v.indicationDate) {
      e.confirmedDate = "A data confirmada não pode ser anterior à data da solicitação.";
    }
    return e;
  }

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      ev.preventDefault();
      setErrors(found);
      toast.error("Revise os campos destacados.");
      // Leva o usuário ao primeiro campo com problema.
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
    }
  }

  function resetToInitial() {
    setValues(initial);
    setErrors({});
    setConfirmDialog(null);
  }

  function handleCancelClick() {
    if (dirty) setConfirmDialog("cancel");
    else router.push(cancelHref);
  }

  const cancelHref = surgery ? `/surgeries/${surgery.id}` : "/kanban";
  const patient = patientOptions.find((p) => p.id === values.patientId);
  const hospital = hospitalOptions.find((h) => h.id === values.hospitalId);
  const insurer = insuranceProviders.find((i) => i.id === values.insuranceProviderId);
  const priority = PRIORITIES.find((p) => p.value === values.priority) ?? PRIORITIES[1];
  const primaryId = (values.procedures.find((p) => p.is_primary) ?? values.procedures[0])?.id;
  const primaryName = procedureOptions.find((p) => p.id === primaryId)?.name;

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]"
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-4 sm:p-6">
            {/* Dados principais */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<User />} htmlFor="patient_search">
                  Paciente *
                </SectionTitle>
                <SearchSelect
                  id="patient_search"
                  name="patient_id"
                  placeholder="Buscar paciente..."
                  emptyText="Nenhum paciente encontrado."
                  options={patientOptions.map((p) => ({ id: p.id, label: p.full_name, hint: p.cpf ?? undefined }))}
                  value={values.patientId}
                  onChange={(id) => set("patientId", id)}
                  invalid={!!errors.patientId}
                  action={
                    <PatientFormDialog
                      insuranceProviders={insuranceProviders}
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          title="Cadastrar novo paciente"
                          aria-label="Cadastrar novo paciente"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                      onCreated={(created) => {
                        setPatientOptions((prev) => [...prev, { ...created, cpf: null }]);
                        set("patientId", created.id);
                        router.refresh();
                      }}
                    />
                  }
                />
                <FieldError message={errors.patientId} />
              </div>

              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Building2 />} htmlFor="hospital_search">
                  Hospital *
                </SectionTitle>
                <SearchSelect
                  id="hospital_search"
                  name="hospital_id"
                  placeholder="Buscar hospital..."
                  emptyText="Nenhum hospital encontrado."
                  options={hospitalOptions.map((h) => ({ id: h.id, label: h.name }))}
                  value={values.hospitalId}
                  onChange={(id) => set("hospitalId", id)}
                  invalid={!!errors.hospitalId}
                  action={
                    <HospitalFormDialog
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          title="Cadastrar novo hospital"
                          aria-label="Cadastrar novo hospital"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                      onCreated={(created) => {
                        setHospitalOptions((prev) => [...prev, created]);
                        set("hospitalId", created.id);
                        router.refresh();
                      }}
                    />
                  }
                />
                <FieldError message={errors.hospitalId} />
              </div>
            </div>

            <hr className="border-border" />

            {/* Procedimentos */}
            <div className="flex flex-col gap-2">
              <SectionTitle icon={<ClipboardList />} htmlFor="procedure_search">
                Procedimentos *
              </SectionTitle>
              <ProceduresMultiSelect
                procedures={procedureOptions}
                selected={values.procedures}
                onChange={(next) => set("procedures", next)}
                invalid={!!errors.procedures}
              />
              <FieldError message={errors.procedures} />
            </div>

            <hr className="border-border" />

            {/* Informações administrativas */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Stethoscope />}>Tipo de atendimento *</SectionTitle>
                <div
                  role="radiogroup"
                  aria-label="Tipo de atendimento"
                  className="grid h-10 grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                >
                  {(
                    [
                      ["particular", "Particular"],
                      ["convenio", "Convênio"],
                    ] as const
                  ).map(([value, label]) => {
                    const active = values.attendanceType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => set("attendanceType", value)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="attendance_type" value={values.attendanceType} />
              </div>

              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Flag />} htmlFor="priority">
                  Prioridade
                </SectionTitle>
                <Select name="priority" value={values.priority} onValueChange={(v) => set("priority", v as Priority)}>
                  <SelectTrigger id="priority" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", p.dot)} />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarPlus />} htmlFor="indication_date">
                  Data da solicitação
                </SectionTitle>
                <Input
                  id="indication_date"
                  name="indication_date"
                  type="date"
                  className="h-10"
                  value={values.indicationDate}
                  onChange={(e) => set("indicationDate", e.target.value)}
                />
              </div>
            </div>

            {values.attendanceType === "convenio" ? (
              <div className="flex flex-col gap-2 md:max-w-sm">
                <SectionTitle icon={<HeartHandshake />} htmlFor="insurance_provider_id">
                  Operadora *
                </SectionTitle>
                <Select
                  name="insurance_provider_id"
                  value={values.insuranceProviderId}
                  onValueChange={(v) => set("insuranceProviderId", v)}
                >
                  <SelectTrigger
                    id="insurance_provider_id"
                    className="h-10"
                    aria-invalid={!!errors.insuranceProviderId || undefined}
                  >
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
                <FieldError message={errors.insuranceProviderId} />
              </div>
            ) : null}

            <hr className="border-border" />

            {/* Programação cirúrgica */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarClock />} htmlFor="expected_date">
                  Data prevista
                </SectionTitle>
                <Input
                  id="expected_date"
                  name="expected_date"
                  type="date"
                  className="h-10"
                  value={values.expectedDate}
                  onChange={(e) => set("expectedDate", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Estimativa para realizar a cirurgia.</p>
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarCheck />} htmlFor="confirmed_date">
                  Data confirmada
                </SectionTitle>
                <Input
                  id="confirmed_date"
                  name="confirmed_date"
                  type="date"
                  className="h-10"
                  value={values.confirmedDate}
                  onChange={(e) => set("confirmedDate", e.target.value)}
                  aria-invalid={!!errors.confirmedDate || undefined}
                />
                <FieldError message={errors.confirmedDate} />
                {!errors.confirmedDate ? (
                  <p className="text-xs text-muted-foreground">Só quando o hospital confirmar.</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Clock />} htmlFor="confirmed_time">
                  Horário confirmado
                </SectionTitle>
                <Input
                  id="confirmed_time"
                  name="confirmed_time"
                  type="time"
                  className="h-10"
                  value={values.confirmedTime}
                  onChange={(e) => set("confirmedTime", e.target.value)}
                  aria-invalid={!!errors.confirmedTime || undefined}
                />
                <FieldError message={errors.confirmedTime} />
              </div>
            </div>

            {/* Observações */}
            <div className="flex flex-col gap-2">
              <SectionTitle icon={<FileText />} htmlFor="admin_notes">
                Observações administrativas
              </SectionTitle>
              <Textarea
                id="admin_notes"
                name="admin_notes"
                rows={3}
                maxLength={ADMIN_NOTES_MAX}
                placeholder="Informações adicionais sobre a solicitação, agendamento ou orientações administrativas..."
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground">
                {values.notes.length} / {ADMIN_NOTES_MAX}
              </p>
            </div>

            {state.error ? (
              <p
                className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {state.error}
              </p>
            ) : null}
          </div>

          {/* Rodapé */}
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full sm:w-auto"
              onClick={() => (dirty ? setConfirmDialog("clear") : resetToInitial())}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" />
              {surgery ? "Desfazer alterações" : "Limpar campos"}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full sm:w-auto"
                onClick={handleCancelClick}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" className="h-10 w-full px-6 sm:w-auto" disabled={pending}>
                <Check className="h-4 w-4" />
                {pending ? "Salvando..." : surgery ? "Salvar alterações" : "Salvar cirurgia"}
              </Button>
            </div>
          </div>
        </div>

        {/* Resumo (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 pb-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Resumo da cirurgia</h2>
            </div>
            <SummaryRow icon={<User />} label="Paciente">
              {patient?.full_name ?? "—"}
            </SummaryRow>
            <SummaryRow icon={<Building2 />} label="Hospital">
              {hospital?.name ?? "—"}
            </SummaryRow>
            <SummaryRow icon={<Stethoscope />} label="Procedimento(s)">
              {values.procedures.length > 0 ? (
                <>
                  {values.procedures.length}
                  {primaryName ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{primaryName}</span>
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </SummaryRow>
            <SummaryRow icon={<CalendarPlus />} label="Data da solicitação">
              {formatDate(values.indicationDate)}
            </SummaryRow>
            <SummaryRow icon={<HeartHandshake />} label="Tipo de atendimento">
              {values.attendanceType === "convenio" ? (insurer ? `Convênio · ${insurer.name}` : "Convênio") : "Particular"}
            </SummaryRow>
            <SummaryRow icon={<Flag />} label="Prioridade">
              <span className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", priority.dot)} />
                {priority.label}
              </span>
            </SummaryRow>
          </div>
        </aside>
      </form>

      <Dialog open={confirmDialog !== null} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog === "clear" ? (surgery ? "Desfazer alterações?" : "Limpar campos?") : "Descartar o que foi preenchido?"}</DialogTitle>
            <DialogDescription>
              {confirmDialog === "clear"
                ? surgery
                  ? "As alterações ainda não salvas serão descartadas."
                  : "Todos os campos preenchidos serão apagados."
                : "Você preencheu informações que ainda não foram salvas. Se sair agora, elas serão perdidas."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmDialog(null)}>
              Continuar editando
            </Button>
            {confirmDialog === "clear" ? (
              <Button type="button" onClick={resetToInitial}>
                {surgery ? "Desfazer" : "Limpar"}
              </Button>
            ) : (
              <Button type="button" asChild>
                <Link href={cancelHref}>Descartar e sair</Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
