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
  Package,
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
import type { SurgeryMaterialEditItem } from "@/lib/data/operations";
import type { PatientSelectOption } from "@/lib/data/patients";
import { parseSurgeryNotes } from "@/lib/surgery-notes";
import {
  addSurgeryMaterialStructuredAction,
  removeSurgeryMaterialItemAction,
  updateSurgeryMaterialStructuredAction,
  validateAllSurgeryMaterialsAction,
} from "@/app/(dashboard)/surgeries/operations-actions";
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
import { RequestReader, type ReaderApplyResult } from "@/components/surgeries/request-reader";
import { InsuranceSection, cardValidityState, type InsuranceValues } from "@/components/surgeries/insurance-section";
import { MaterialsEditor, type EditorAdapter, type EditorItem } from "@/components/surgeries/materials-editor";

const initialState: SurgeryFormState = {};

type SelectOption = { id: string; name: string };
type PatientOption = PatientSelectOption;
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
  indication: string;
  guideObservations: string;
  internalNotes: string;
  insurance: Omit<InsuranceValues, "providerId">;
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

const hasInsuranceData = (pat?: PatientSelectOption) =>
  Boolean(pat && (pat.insurance_provider_id || pat.insurance_card_number || pat.insurance_card_validity || pat.insurance_plan || pat.insurance_accommodation));

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
  materialItems = [],
  canUploadCards = false,
}: {
  surgery?: Surgery;
  patients: PatientOption[];
  hospitals: SelectOption[];
  insuranceProviders: SelectOption[];
  procedures: ProcedureOption[];
  /** Materiais já gravados da cirurgia (somente na edição). */
  materialItems?: SurgeryMaterialEditItem[];
  /** Pode anexar a carteirinha ao cadastro do paciente (permissão de edição de pacientes). */
  canUploadCards?: boolean;
}) {
  const action = surgery ? updateSurgeryAction.bind(null, surgery.id) : createSurgeryAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const initial: FormValues = useMemo(() => {
    const parsedNotes = parseSurgeryNotes(surgery?.admin_notes);
    const pat = patients.find((x) => x.id === surgery?.patient_id);
    return {
      patientId: surgery?.patient_id ?? "",
      hospitalId: surgery?.hospital_id ?? "",
      procedures: surgery?.procedures.map((p) => ({ id: p.id, is_primary: p.is_primary })) ?? [],
      attendanceType: surgery?.attendance_type ?? "particular",
      insuranceProviderId: surgery?.insurance_provider_id ?? "",
      priority: (surgery?.priority as Priority | undefined) ?? "normal",
      indicationDate: surgery?.indication_date ?? todayInSaoPaulo(),
      expectedDate: surgery?.expected_date ?? "",
      confirmedDate: surgery?.confirmed_date ?? "",
      confirmedTime: surgery?.confirmed_time?.slice(0, 5) ?? "",
      indication: parsedNotes.indication ?? "",
      guideObservations: parsedNotes.guideObservations ?? "",
      internalNotes: parsedNotes.other ?? "",
      insurance: {
        plan: pat?.insurance_plan ?? "",
        cardNumber: pat?.insurance_card_number ?? "",
        cardValidity: pat?.insurance_card_validity ?? "",
        accommodation: pat?.insurance_accommodation ?? "",
        // Paciente sem convênio no cadastro: já sugere gravar estes dados nele.
        updatePatient: surgery?.attendance_type === "convenio" && !hasInsuranceData(pat),
      },
    };
  }, [surgery, patients]);



  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [patientOptions, setPatientOptions] = useState(patients);
  const [hospitalOptions, setHospitalOptions] = useState(hospitals);
  const [confirmDialog, setConfirmDialog] = useState<"clear" | "cancel" | null>(null);
  // Materiais sugeridos pela leitura do pedido: gravados junto com a cirurgia nova.
  const [extraProcedures, setExtraProcedures] = useState<ProcedureOption[]>([]);
  // Criação: materiais ainda não gravados (vindos da guia ou digitados). Edição: usa os do banco.
  const [staged, setStaged] = useState<EditorItem[]>([]);
  const [insuranceRecovered, setInsuranceRecovered] = useState(() =>
    hasInsuranceData(patients.find((x) => x.id === surgery?.patient_id))
  );

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
      .map((p) => ({ id: p.id, name: p.name, tuss_code: p.tuss_code ?? null }));
    const withExtra = [...procedures, ...extra];
    const have = new Set(withExtra.map((p) => p.id));
    return [...withExtra, ...extraProcedures.filter((p) => !have.has(p.id))];
  }, [procedures, surgery, extraProcedures]);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function setInsurance(patch: Partial<InsuranceValues>) {
    const { providerId, ...rest } = patch;
    if (providerId !== undefined) set("insuranceProviderId", providerId);
    if (Object.keys(rest).length > 0) {
      setValues((prev) => ({ ...prev, insurance: { ...prev.insurance, ...rest } }));
      // Alterou algo recuperado do cadastro: oferece atualizar o paciente.
      if (Object.keys(rest).some((k) => k !== "updatePatient")) {
        setValues((prev) => ({ ...prev, insurance: { ...prev.insurance, updatePatient: true } }));
      }
    }
  }

  /** Recupera operadora/carteirinha do cadastro do paciente (sem inventar nada). */
  function recoverInsurance(patientId: string) {
    const pat = patientOptions.find((x) => x.id === patientId);
    const has = hasInsuranceData(pat);
    setInsuranceRecovered(has);
    if (!pat) return;
    setValues((prev) => ({
      ...prev,
      insuranceProviderId: pat.insurance_provider_id ?? prev.insuranceProviderId,
      insurance: {
        plan: pat.insurance_plan ?? "",
        cardNumber: pat.insurance_card_number ?? "",
        cardValidity: pat.insurance_card_validity ?? "",
        accommodation: pat.insurance_accommodation ?? "",
        updatePatient: !has,
      },
    }));
  }

  function choosePatient(id: string) {
    set("patientId", id);
    if (values.attendanceType === "convenio") recoverInsurance(id);
  }

  function chooseAttendance(value: Attendance) {
    set("attendanceType", value);
    if (value === "convenio" && values.patientId && !values.insurance.cardNumber && !values.insuranceProviderId) {
      recoverInsurance(values.patientId);
    }
  }

  const composedNotes = [
    values.indication.trim() ? `Indicação clínica: ${values.indication.trim()}` : "",
    values.guideObservations.trim() ? `Observações da guia: ${values.guideObservations.trim()}` : "",
    values.internalNotes.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const dirty = JSON.stringify(values) !== JSON.stringify(initial) || staged.length > 0;

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
    if (composedNotes.length > ADMIN_NOTES_MAX) {
      e.guideObservations = `Indicação e observações somam ${composedNotes.length} caracteres (máximo ${ADMIN_NOTES_MAX}).`;
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

  const guidePhotoRef = useRef<HTMLInputElement>(null);
  const guideFileRef = useRef<File | null>(null);

  // O React limpa campos não controlados depois de enviar o formulário; se o
  // envio voltou com erro, recoloca a foto para não perdê-la.
  useEffect(() => {
    if (state.error && guideFileRef.current && guidePhotoRef.current && !guidePhotoRef.current.files?.length) {
      const dt = new DataTransfer();
      dt.items.add(guideFileRef.current);
      guidePhotoRef.current.files = dt.files;
    }
  }, [state]);
  const [guidePhotoName, setGuidePhotoName] = useState<string | null>(null);

  function applyReader(result: ReaderApplyResult) {
    setValues((prev) => {
      const known = new Set(prev.procedures.map((p) => p.id));
      const added = result.procedureIds.filter((id) => !known.has(id));
      const merged = [...prev.procedures, ...added.map((id) => ({ id, is_primary: false }))];
      if (merged.length > 0 && !merged.some((p) => p.is_primary)) merged[0] = { ...merged[0], is_primary: true };
      const joinText = (a: string, b: string | null) => (b && !a.includes(b) ? [a.trim(), b].filter(Boolean).join("\n") : a);
      return {
        ...prev,
        patientId:
          result.patientId &&
          (result.createdPatient?.id === result.patientId || patientOptions.some((p) => p.id === result.patientId))
            ? result.patientId
            : prev.patientId,
        procedures: merged,
        indication: joinText(prev.indication, result.clinicalIndication),
        guideObservations: joinText(prev.guideObservations, result.observations),
      };
    });
    setErrors({});
    setExtraProcedures((prev) => [...prev, ...result.createdProcedures]);
    const created = result.createdPatient;
    if (created) {
      setPatientOptions((prev) =>
        prev.some((p) => p.id === created.id)
          ? prev
          : [...prev, { ...created, cpf: null, insurance_provider_id: null, insurance_card_number: null, insurance_card_validity: null, insurance_plan: null, insurance_accommodation: null }]
      );
    }
    setStaged((prev) => {
      const have = new Set(prev.map((m) => m.material_id));
      const incoming = result.materials
        .filter((m) => !have.has(m.id))
        .map<EditorItem>((m) => ({
          key: `s-${m.id}`,
          material_id: m.id,
          name: m.name,
          tuss_code: null,
          quantity: m.quantity,
          notes: "",
          validated: false,
          ai: true,
          supplier_name: m.supplier_name,
          supplier_id: m.supplier_id,
        }));
      return [...prev, ...incoming];
    });
    attachGuidePhoto(result.guideFile);
  }

  // A foto da guia segue junto com o formulário (campo de arquivo oculto) e é
  // anexada à cirurgia ao salvar.
  function attachGuidePhoto(file: File | null) {
    guideFileRef.current = file;
    const input = guidePhotoRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    if (file) dt.items.add(file);
    input.files = dt.files;
    setGuidePhotoName(file ? file.name : null);
  }

  function resetToInitial() {
    attachGuidePhoto(null);
    setStaged([]);
    setValues(initial);
    setInsuranceRecovered(false);
    setErrors({});
    setConfirmDialog(null);
  }

  function handleCancelClick() {
    if (dirty) setConfirmDialog("cancel");
    else router.push(cancelHref);
  }

  // --- Materiais ---------------------------------------------------------------
  const stagedAdapter: EditorAdapter = {
    onAdd: (m, quantity, notes) => {
      if (staged.some((x) => x.material_id === m.id)) return "Este material já está na lista.";
      setStaged((prev) => [...prev, { key: `s-${m.id}`, material_id: m.id, name: m.name, tuss_code: m.tuss_code, quantity, notes, validated: true, ai: false }]);
      return null;
    },
    onUpdate: (key, patch) => {
      setStaged((prev) => prev.map((x) => (x.key === key ? { ...x, ...patch } : x)));
      return null;
    },
    onRemove: (key) => {
      setStaged((prev) => prev.filter((x) => x.key !== key));
      return null;
    },
    onValidateAll: () => {
      setStaged((prev) => prev.map((x) => ({ ...x, validated: true })));
      return null;
    },
  };

  const persistedAdapter: EditorAdapter = {
    onAdd: async (m, quantity, notes) => {
      const res = await addSurgeryMaterialStructuredAction(surgery!.id, { material_id: m.id, quantity, notes });
      router.refresh();
      return res.error ?? null;
    },
    onUpdate: async (key, patch) => {
      const res = await updateSurgeryMaterialStructuredAction(key, surgery!.id, patch);
      router.refresh();
      return res.error ?? null;
    },
    onRemove: async (key) => {
      await removeSurgeryMaterialItemAction(key, surgery!.id);
      router.refresh();
      return null;
    },
    onValidateAll: async () => {
      const res = await validateAllSurgeryMaterialsAction(surgery!.id);
      router.refresh();
      return res.error ?? null;
    },
  };

  const persistedItems: EditorItem[] = materialItems.map((m) => ({
    key: m.id,
    material_id: m.material_id,
    name: m.material?.name ?? "Material removido",
    tuss_code: m.material?.tuss_code ?? null,
    quantity: Number(m.quantity),
    notes: m.notes ?? "",
    validated: m.validated,
    ai: m.ai_suggested,
    supplier_name: m.supplier?.company_name ?? null,
  }));
  const editorItems = surgery ? persistedItems : staged;
  const materialsToValidate = editorItems.filter((i) => !i.validated).length;

  const cancelHref = surgery ? `/surgeries/${surgery.id}` : "/kanban";
  const patient = patientOptions.find((p) => p.id === values.patientId);
  const hospital = hospitalOptions.find((h) => h.id === values.hospitalId);
  const insurer = insuranceProviders.find((i) => i.id === values.insuranceProviderId);
  const priority = PRIORITIES.find((p) => p.value === values.priority) ?? PRIORITIES[1];
  const primaryId = (values.procedures.find((p) => p.is_primary) ?? values.procedures[0])?.id;
  const primaryName = procedureOptions.find((p) => p.id === primaryId)?.name;
  const cardState = cardValidityState(values.insurance.cardValidity);
  const isConvenio = values.attendanceType === "convenio";

  const actionButtons = (
    <>
      <Button type="button" variant="outline" className="h-10" onClick={handleCancelClick} disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" className="h-10 px-5" disabled={pending}>
        <Check className="h-4 w-4" />
        {pending ? "Salvando..." : surgery ? "Salvar alterações" : "Salvar cirurgia"}
      </Button>
    </>
  );

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Enter nos campos da lista de materiais não deve salvar a cirurgia.
          if (e.key === "Enter" && (e.target as HTMLElement).closest("[data-no-enter-submit]")) e.preventDefault();
        }}
        noValidate
        className="grid grid-cols-1 items-start gap-4 pb-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:pb-0"
      >
        <div className="flex flex-col gap-4">
          {!surgery ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <RequestReader onApply={applyReader} />
            </div>
          ) : null}
          <input ref={guidePhotoRef} type="file" name="guide_photo" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" />
          {guidePhotoName ? (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              A foto da guia será anexada a esta cirurgia ao salvar.
              <button type="button" className="underline hover:text-foreground" onClick={() => attachGuidePhoto(null)}>
                Não anexar
              </button>
            </p>
          ) : null}

          {/* Paciente e atendimento */}
          <section className="rounded-xl border border-border bg-card p-4" aria-label="Paciente e atendimento">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><User className="h-4 w-4" /></span>
              Paciente e atendimento
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<User />} htmlFor="patient_search">Paciente *</SectionTitle>
                <SearchSelect
                  id="patient_search"
                  name="patient_id"
                  placeholder="Buscar paciente..."
                  emptyText="Nenhum paciente encontrado."
                  options={patientOptions.map((p) => ({ id: p.id, label: p.full_name, hint: p.cpf ?? undefined }))}
                  value={values.patientId}
                  onChange={choosePatient}
                  invalid={!!errors.patientId}
                  action={
                    <PatientFormDialog
                      insuranceProviders={insuranceProviders}
                      trigger={
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Cadastrar novo paciente" aria-label="Cadastrar novo paciente">
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                      onCreated={(created) => {
                        setPatientOptions((prev) => [...prev, { ...created, cpf: null, insurance_provider_id: null, insurance_card_number: null, insurance_card_validity: null, insurance_plan: null, insurance_accommodation: null }]);
                        set("patientId", created.id);
                        router.refresh();
                      }}
                    />
                  }
                />
                <FieldError message={errors.patientId} />
              </div>

              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Building2 />} htmlFor="hospital_search">Hospital *</SectionTitle>
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
                        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Cadastrar novo hospital" aria-label="Cadastrar novo hospital">
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

              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Stethoscope />}>Tipo de atendimento *</SectionTitle>
                <div role="radiogroup" aria-label="Tipo de atendimento" className="grid h-10 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {([["particular", "Particular"], ["convenio", "Convênio"]] as const).map(([value, label]) => {
                    const active = values.attendanceType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => chooseAttendance(value)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
                          active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
                <SectionTitle icon={<Flag />} htmlFor="priority">Prioridade</SectionTitle>
                <Select name="priority" value={values.priority} onValueChange={(v) => set("priority", v as Priority)}>
                  <SelectTrigger id="priority" className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", p.dot)} />{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 xl:grid-cols-4">
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarPlus />} htmlFor="indication_date">Solicitação</SectionTitle>
                <Input id="indication_date" name="indication_date" type="date" className="h-10" value={values.indicationDate} onChange={(e) => set("indicationDate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarClock />} htmlFor="expected_date">Data prevista</SectionTitle>
                <Input id="expected_date" name="expected_date" type="date" className="h-10" value={values.expectedDate} onChange={(e) => set("expectedDate", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<CalendarCheck />} htmlFor="confirmed_date">Data confirmada</SectionTitle>
                <Input id="confirmed_date" name="confirmed_date" type="date" className="h-10" value={values.confirmedDate} onChange={(e) => set("confirmedDate", e.target.value)} aria-invalid={!!errors.confirmedDate || undefined} />
                <FieldError message={errors.confirmedDate} />
              </div>
              <div className="flex flex-col gap-2">
                <SectionTitle icon={<Clock />} htmlFor="confirmed_time">Horário</SectionTitle>
                <Input id="confirmed_time" name="confirmed_time" type="time" className="h-10" value={values.confirmedTime} onChange={(e) => set("confirmedTime", e.target.value)} aria-invalid={!!errors.confirmedTime || undefined} />
                <FieldError message={errors.confirmedTime} />
              </div>
            </div>
          </section>

          {/* Convênio (só quando selecionado) */}
          {isConvenio ? (
            <InsuranceSection
              patientId={values.patientId}
              providers={insuranceProviders}
              values={{ providerId: values.insuranceProviderId, ...values.insurance }}
              onChange={setInsurance}
              providerError={errors.insuranceProviderId}
              recovered={insuranceRecovered}
              patientWithoutInsurance={Boolean(values.patientId) && !hasInsuranceData(patientOptions.find((x) => x.id === values.patientId))}
              canUploadCards={canUploadCards}
            />
          ) : null}

          {/* Procedimentos */}
          <section className="rounded-xl border border-border bg-card p-4" aria-label="Procedimentos cirúrgicos">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500"><ClipboardList className="h-4 w-4" /></span>
              Procedimentos cirúrgicos *
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{values.procedures.length}</span>
            </h2>
            <ProceduresMultiSelect
              procedures={procedureOptions}
              selected={values.procedures}
              onChange={(next) => set("procedures", next)}
              invalid={!!errors.procedures}
            />
            <FieldError message={errors.procedures} />
          </section>

          {/* Materiais e OPME — lista única da indicação */}
          <MaterialsEditor
            items={editorItems}
            adapter={surgery ? persistedAdapter : stagedAdapter}
            canEdit
          />
          {!surgery
            ? staged.map((m) => (
                <span key={m.key} className="hidden">
                  <input type="hidden" name="suggested_material_id" value={m.material_id} />
                  <input type="hidden" name="suggested_material_qty" value={m.quantity} />
                  <input type="hidden" name="suggested_material_supplier" value={m.supplier_id ?? ""} />
                  <input type="hidden" name="suggested_material_notes" value={m.notes} />
                  <input type="hidden" name="suggested_material_ai" value={m.ai ? "1" : "0"} />
                  <input type="hidden" name="suggested_material_validated" value={m.validated ? "1" : "0"} />
                </span>
              ))
            : null}

          {/* Indicação clínica e observações */}
          <section className="rounded-xl border border-border bg-card p-4" aria-label="Indicação clínica e observações">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileText className="h-4 w-4" /></span>
              Indicação clínica e observações
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="indication" className="text-sm font-medium">Indicação clínica / diagnóstico</Label>
                <Textarea id="indication" rows={3} placeholder="Diagnóstico ou motivo da cirurgia" value={values.indication} onChange={(e) => set("indication", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="guide_observations" className="text-sm font-medium">Observações da guia (texto original)</Label>
                <Textarea id="guide_observations" rows={3} placeholder="Texto informado pelo médico na guia" value={values.guideObservations} onChange={(e) => set("guideObservations", e.target.value)} aria-invalid={!!errors.guideObservations || undefined} />
                <FieldError message={errors.guideObservations} />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Label htmlFor="internal_notes" className="text-sm font-medium">Observações administrativas</Label>
              <Textarea id="internal_notes" rows={2} placeholder="Informações adicionais sobre a solicitação, agendamento ou orientações administrativas..." value={values.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} />
              <p className="text-right text-xs text-muted-foreground">{composedNotes.length} / {ADMIN_NOTES_MAX} (todos os campos)</p>
            </div>
            <input type="hidden" name="admin_notes" value={composedNotes} />
          </section>

          {state.error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          ) : null}
        </div>

        {/* Painel lateral: ações + resumo (fixo no desktop) */}
        <aside className="lg:sticky lg:top-4">
          <div className="flex flex-col gap-3">
            <div className="hidden gap-2 lg:flex lg:flex-wrap lg:justify-end">{actionButtons}</div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Resumo da cirurgia</h2>
              </div>
              {surgery ? <p className="pb-1 text-base font-semibold text-foreground">{surgery.code}</p> : null}
              <SummaryRow icon={<User />} label="Paciente">{patient?.full_name ?? "—"}</SummaryRow>
              <SummaryRow icon={<Building2 />} label="Hospital">{hospital?.name ?? "—"}</SummaryRow>
              <SummaryRow icon={<HeartHandshake />} label="Tipo de atendimento">
                {isConvenio ? (
                  <>
                    Convênio{insurer ? ` · ${insurer.name}` : ""}
                    {values.insurance.plan ? <span className="block text-xs font-normal text-muted-foreground">Plano: {values.insurance.plan}</span> : null}
                    {values.insurance.cardValidity ? (
                      <span className={cn("block text-xs font-normal", cardState.tone === "expired" ? "text-red-500" : cardState.tone === "near" ? "text-amber-500" : "text-muted-foreground")}>
                        {cardState.label}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Particular"
                )}
              </SummaryRow>
              <SummaryRow icon={<Stethoscope />} label="Procedimentos">
                {values.procedures.length > 0 ? (
                  <>
                    {values.procedures.length}
                    {primaryName ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">Principal: {primaryName}</span> : null}
                  </>
                ) : "—"}
              </SummaryRow>
              <SummaryRow icon={<Package />} label="Materiais / OPME">
                {editorItems.length}
                {materialsToValidate > 0 ? <span className="mt-0.5 block text-xs font-normal text-amber-500">{materialsToValidate} a validar</span> : null}
              </SummaryRow>
              <SummaryRow icon={<Flag />} label="Prioridade">
                <span className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", priority.dot)} />{priority.label}</span>
              </SummaryRow>
              <SummaryRow icon={<CalendarPlus />} label="Data da solicitação">{formatDate(values.indicationDate)}</SummaryRow>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden w-fit self-end text-muted-foreground lg:inline-flex"
              onClick={() => (dirty ? setConfirmDialog("clear") : resetToInitial())}
              disabled={pending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {surgery ? "Desfazer alterações" : "Limpar campos"}
            </Button>
          </div>
        </aside>

        {/* Barra de ações (mobile) */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-end gap-2 border-t border-border bg-card/95 p-3 backdrop-blur lg:hidden">
          {actionButtons}
        </div>
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
            <Button type="button" variant="outline" onClick={() => setConfirmDialog(null)}>Continuar editando</Button>
            {confirmDialog === "clear" ? (
              <Button type="button" onClick={resetToInitial}>{surgery ? "Desfazer" : "Limpar"}</Button>
            ) : (
              <Button type="button" asChild><Link href={cancelHref}>Descartar e sair</Link></Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
