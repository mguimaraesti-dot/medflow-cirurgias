"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Briefcase, Check, Info, Loader2, MapPin, Save, Search, UserPlus, Users, X } from "lucide-react";

import {
  checkPatientCpfAction,
  createPatientAction,
  discardNewPatientAction,
  updatePatientAction,
  type PatientDuplicate,
} from "@/app/(dashboard)/surgeries/patients/actions";
import { calculateAge, type Patient } from "@/lib/data/patients";
import type { PatientDocument } from "@/lib/data/patient-documents";
import { formatCep, formatCpf, formatPhone, isValidCpf, isValidPhone, onlyDigits } from "@/lib/br-format";
import { parseAddress } from "@/lib/patient-address";
import { uploadPatientDocument } from "@/lib/patient-documents-client";
import { cn } from "@/lib/utils";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { DocumentsPanel, type StagedDocument } from "@/components/patients/patient-documents-panel";

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
      <span className="h-5 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </h3>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function PatientFormDialog({
  patient,
  insuranceProviders,
  trigger,
  onCreated,
  documents = [],
  documentsUnavailable,
}: {
  patient?: Patient;
  insuranceProviders: { id: string; name: string }[];
  trigger?: ReactNode;
  /** Chamado uma vez, só no modo de criação, quando um novo paciente é salvo com sucesso. */
  onCreated?: (patient: { id: string; full_name: string }) => void;
  /** Documentos já gravados (modo edição). */
  documents?: PatientDocument[];
  /** Mensagem quando o armazenamento de documentos ainda não está configurado. */
  documentsUnavailable?: string | null;
}) {
  const router = useRouter();
  const initialAddress = parseAddress(patient?.address);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<PatientDuplicate | null>(null);
  const [staged, setStaged] = useState<StagedDocument[]>([]);

  const [fullName, setFullName] = useState(patient?.full_name ?? "");
  const [cpf, setCpf] = useState(formatCpf(patient?.cpf));
  const [cpfStatus, setCpfStatus] = useState<{ error?: string; duplicate?: { id: string; full_name: string } }>({});
  const [birthDate, setBirthDate] = useState(patient?.birth_date ?? "");
  const [phone, setPhone] = useState(formatPhone(patient?.phone));
  const [whatsapp, setWhatsapp] = useState(formatPhone(patient?.whatsapp));
  const [email, setEmail] = useState(patient?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cep, setCep] = useState(formatCep(initialAddress.cep));
  const [cepState, setCepState] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const [street, setStreet] = useState(initialAddress.street);
  const [number, setNumber] = useState(initialAddress.number);
  const [complement, setComplement] = useState(initialAddress.complement);
  const [neighborhood, setNeighborhood] = useState(initialAddress.neighborhood);
  const [city, setCity] = useState(initialAddress.city);
  const [uf, setUf] = useState(initialAddress.state);
  const [attendanceType, setAttendanceType] = useState<"particular" | "convenio">(
    patient?.insurance_provider_id ? "convenio" : "particular"
  );
  const formRef = useRef<HTMLFormElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const lastCepLookup = useRef<string>("");

  const age = birthDate ? calculateAge(birthDate) : null;
  const canEditDocs = true; // o próprio diálogo só salva para quem tem permissão de edição (a action confere)

  // Reabrir o diálogo de edição volta aos dados salvos (descarta rascunho cancelado).
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setDuplicate(null);
  }, [open]);

  async function lookupCep(digits: string) {
    if (digits.length !== 8 || lastCepLookup.current === digits) return;
    lastCepLookup.current = digits;
    setCepState("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error("http");
      const data = (await res.json()) as {
        erro?: boolean | string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        setCepState("notfound");
        return;
      }
      // Só preenche o que veio; número e complemento são sempre manuais.
      if (data.logradouro) setStreet(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setUf(data.uf);
      setCepState("idle");
      numberRef.current?.focus();
    } catch {
      lastCepLookup.current = "";
      setCepState("error");
    }
  }

  function onCepChange(value: string) {
    const masked = formatCep(value);
    setCep(masked);
    setCepState("idle");
    const digits = onlyDigits(masked);
    if (digits.length === 8) void lookupCep(digits);
    else lastCepLookup.current = "";
  }

  async function onCpfBlur() {
    const digits = onlyDigits(cpf);
    if (!digits) return setCpfStatus({});
    if (!isValidCpf(digits)) {
      // CPF legado já salvo e inalterado não é acusado como erro.
      if (patient?.cpf && onlyDigits(patient.cpf) === digits) return setCpfStatus({});
      return setCpfStatus({ error: "CPF inválido." });
    }
    const { duplicate: dup } = await checkPatientCpfAction(digits, patient?.id);
    setCpfStatus(dup ? { duplicate: dup } : {});
  }

  function onEmailBlur() {
    const v = email.trim();
    setEmailError(v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "E-mail inválido." : null);
  }

  function resetDraft() {
    setStaged([]);
    setError(null);
    setDuplicate(null);
    if (!patient) {
      setFullName(""); setCpf(""); setBirthDate(""); setPhone(""); setWhatsapp(""); setEmail("");
      setCep(""); setStreet(""); setNumber(""); setComplement(""); setNeighborhood(""); setCity(""); setUf("");
      setAttendanceType("particular"); setCpfStatus({}); setEmailError(null); setCepState("idle");
      lastCepLookup.current = "";
    }
  }

  async function submit(form: HTMLFormElement, confirmDuplicate = false) {
    if (busy) return;
    setError(null);
    setDuplicate(null);

    if (cpfStatus.error) return setError(cpfStatus.error);
    if (onlyDigits(phone) && !isValidPhone(phone) && onlyDigits(phone) !== onlyDigits(patient?.phone)) {
      return setError("Celular inválido. Informe DDD + número.");
    }
    if (onlyDigits(whatsapp) && !isValidPhone(whatsapp) && onlyDigits(whatsapp) !== onlyDigits(patient?.whatsapp)) {
      return setError("Telefone de contato inválido. Informe DDD + número.");
    }
    if (emailError) return setError(emailError);

    const formData = new FormData(form);
    if (confirmDuplicate) formData.set("confirm_duplicate", "1");

    setBusy(true);
    try {
      // 1) dados cadastrais
      let patientId = patient?.id;
      let createdName = fullName;
      if (patient) {
        const result = await updatePatientAction(patient.id, {}, formData);
        if (result.error) {
          setDuplicate(result.duplicate ?? null);
          return setError(result.error);
        }
      } else {
        const result = await createPatientAction({}, formData);
        if (result.error || !result.created) {
          setDuplicate(result.duplicate ?? null);
          return setError(result.error ?? "Não foi possível salvar o paciente.");
        }
        patientId = result.created.id;
        createdName = result.created.full_name;
      }

      // 2) documentos novos
      const pending = staged.filter((d) => d.status !== "done");
      let failed = 0;
      for (const doc of pending) {
        setStaged((cur) => cur.map((d) => (d.key === doc.key ? { ...d, status: "uploading", error: undefined } : d)));
        const message = await uploadPatientDocument(patientId!, doc.file, doc.category);
        failed += message ? 1 : 0;
        setStaged((cur) =>
          cur.map((d) => (d.key === doc.key ? { ...d, status: message ? "error" : "done", error: message ?? undefined } : d))
        );
      }

      if (failed > 0) {
        if (!patient) {
          // Cadastro novo é tudo-ou-nada: desfaz o paciente e os arquivos já enviados.
          const undone = await discardNewPatientAction(patientId!);
          setStaged((cur) => cur.map((d) => ({ ...d, status: "pending" })));
          return setError(
            undone.error
              ? `${failed} documento(s) não foram enviados e o cadastro não pôde ser desfeito automaticamente — o paciente foi salvo. Abra a ficha dele para anexar os documentos.`
              : `${failed} documento(s) não foram enviados, então nada foi salvo. Revise os arquivos e tente novamente.`
          );
        }
        router.refresh();
        return setError(`Dados salvos, mas ${failed} documento(s) não foram enviados. Remova ou tente enviar novamente.`);
      }

      toast.success(patient ? "Paciente atualizado." : "Paciente cadastrado.");
      setOpen(false);
      setStaged([]);
      if (!patient) {
        resetDraft();
        onCreated?.({ id: patientId!, full_name: createdName });
      }
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Verifique a conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const providerRequired = attendanceType === "convenio";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next && !patient) resetDraft();
        if (!next) setStaged([]);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant={patient ? "outline" : "default"} size={patient ? "sm" : "default"}>
            {patient ? "Editar" : "Novo paciente"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl gap-0 p-0 sm:rounded-2xl">
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            void submit(e.currentTarget);
          }}
          noValidate
          className="flex flex-col"
        >
          <DialogHeader className="flex-row items-center gap-3 border-b border-border p-4 pr-14 sm:p-6 sm:pr-14">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-semibold">{patient ? "Editar paciente" : "Novo Paciente"}</DialogTitle>
              <DialogDescription>
                {patient
                  ? "Atualize os dados e os documentos do paciente."
                  : "Cadastre um novo paciente no sistema. Um paciente pode ter várias cirurgias ao longo do tempo."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {/* ===== Dados cadastrais ===== */}
            <div className="flex min-w-0 flex-col gap-6">
              <section className="flex flex-col gap-4">
                <SectionTitle>Dados pessoais</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="full_name" label="Nome completo" required>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Digite o nome completo..."
                      className="h-11"
                      autoComplete="off"
                      required
                    />
                  </Field>
                  <Field
                    id="cpf"
                    label="CPF"
                    error={cpfStatus.error}
                  >
                    <Input
                      id="cpf"
                      name="cpf"
                      inputMode="numeric"
                      value={cpf}
                      onChange={(e) => {
                        setCpf(formatCpf(e.target.value));
                        setCpfStatus({});
                      }}
                      onBlur={onCpfBlur}
                      placeholder="000.000.000-00"
                      className="h-11"
                      autoComplete="off"
                    />
                    {cpfStatus.duplicate ? (
                      <p className="flex items-start gap-1.5 text-xs text-destructive" role="alert">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Já existe um paciente com esse CPF:{" "}
                          <Link href={`/surgeries/patients/${cpfStatus.duplicate.id}`} className="font-medium underline" target="_blank">
                            {cpfStatus.duplicate.full_name}
                          </Link>
                          .
                        </span>
                      </p>
                    ) : null}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_8rem_1fr]">
                  <Field id="birth_date" label="Data de nascimento">
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      value={birthDate}
                      max={new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-11"
                    />
                  </Field>
                  <Field id="age" label="Idade">
                    <Input
                      id="age"
                      readOnly
                      tabIndex={-1}
                      value={age !== null && age >= 0 ? `${age} ${age === 1 ? "ano" : "anos"}` : "—"}
                      className="h-11 bg-muted/50 text-muted-foreground"
                      aria-label="Idade (calculada automaticamente)"
                    />
                  </Field>
                  <Field id="phone" label="Celular">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="h-11"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="whatsapp" label="Telefone de contato alternativo">
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="h-11"
                    />
                  </Field>
                  <Field id="email" label="E-mail" error={emailError}>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      onBlur={onEmailBlur}
                      placeholder="nome@email.com"
                      className="h-11"
                    />
                  </Field>
                </div>
              </section>

              <section className="flex flex-col gap-4 border-t border-border pt-5">
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    Endereço <MapPin className="h-4 w-4 text-muted-foreground" />
                  </span>
                </SectionTitle>
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr_7rem]">
                  <Field
                    id="address_cep"
                    label="CEP"
                    hint={
                      cepState === "loading" ? (
                        <span className="inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Buscando endereço...
                        </span>
                      ) : cepState === "notfound" ? (
                        "CEP não encontrado. Preencha manualmente."
                      ) : cepState === "error" ? (
                        "Não foi possível consultar o CEP. Preencha manualmente."
                      ) : undefined
                    }
                  >
                    <div className="relative">
                      <Input
                        id="address_cep"
                        name="address_cep"
                        inputMode="numeric"
                        value={cep}
                        onChange={(e) => onCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="h-11 pr-9"
                      />
                      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </Field>
                  <Field id="address_street" label="Logradouro">
                    <Input id="address_street" name="address_street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua, avenida..." className="h-11" />
                  </Field>
                  <Field id="address_number" label="Número">
                    <Input id="address_number" name="address_number" ref={numberRef} value={number} onChange={(e) => setNumber(e.target.value)} className="h-11" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="address_complement" label="Complemento">
                    <Input id="address_complement" name="address_complement" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, bloco..." className="h-11" />
                  </Field>
                  <Field id="address_neighborhood" label="Bairro">
                    <Input id="address_neighborhood" name="address_neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="h-11" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
                  <Field id="address_city" label="Cidade">
                    <Input id="address_city" name="address_city" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" />
                  </Field>
                  <Field id="address_state" label="UF">
                    <Input
                      id="address_state"
                      name="address_state"
                      value={uf}
                      maxLength={2}
                      onChange={(e) => setUf(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
                      placeholder="SP"
                      className="h-11"
                    />
                  </Field>
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <SectionTitle>Tipo de atendimento</SectionTitle>
                <input type="hidden" name="attendance_type" value={attendanceType} />
                <div role="radiogroup" aria-label="Tipo de atendimento" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "particular", label: "Particular", Icon: Briefcase },
                      { value: "convenio", label: "Convênio", Icon: Users },
                    ] as const
                  ).map(({ value, label, Icon }) => {
                    const active = attendanceType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setAttendanceType(value)}
                        className={cn(
                          "flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-muted/40 text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                        {active ? <Check className="h-4 w-4" /> : null}
                      </button>
                    );
                  })}
                </div>

                {providerRequired ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="insurance_provider_id" label="Operadora de saúde" required className="sm:col-span-2">
                      <Select name="insurance_provider_id" defaultValue={patient?.insurance_provider_id ?? undefined}>
                        <SelectTrigger id="insurance_provider_id" className="h-11">
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
                    </Field>
                    <Field id="insurance_card_number" label="Número da carteirinha">
                      <Input id="insurance_card_number" name="insurance_card_number" defaultValue={patient?.insurance_card_number ?? ""} className="h-11" />
                    </Field>
                    <Field id="insurance_card_validity" label="Validade da carteirinha">
                      <Input id="insurance_card_validity" name="insurance_card_validity" type="date" defaultValue={patient?.insurance_card_validity ?? ""} className="h-11" />
                    </Field>
                  </div>
                ) : null}
              </section>

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <SectionTitle>Observações administrativas</SectionTitle>
                <Textarea
                  id="admin_notes"
                  name="admin_notes"
                  defaultValue={patient?.admin_notes ?? ""}
                  placeholder="Informações administrativas complementares (não use para dados clínicos)."
                  aria-label="Observações administrativas"
                  rows={3}
                />
              </section>
            </div>

            {/* ===== Documentos ===== */}
            <DocumentsPanel
              documents={documents}
              staged={staged}
              onStagedChange={setStaged}
              canEdit={canEditDocs}
              unavailableMessage={documentsUnavailable}
              disabled={busy}
            />
          </div>

          {/* ===== Rodapé ===== */}
          <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-2xl border-t border-border bg-card p-4 sm:p-5">
            {error ? (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <p className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
                {duplicate ? (
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    <Link href={`/surgeries/patients/${duplicate.id}`} target="_blank" className="font-medium underline">
                      Abrir cadastro existente
                    </Link>
                    {duplicate.kind === "name" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => formRef.current && void submit(formRef.current, true)}
                      >
                        É outra pessoa — cadastrar mesmo assim
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-primary sm:text-sm">
                <Info className="h-4 w-4 shrink-0" />
                Os campos com <span className="font-semibold">*</span> são obrigatórios.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" disabled={busy} onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="h-11 flex-1 sm:flex-none" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {busy ? "Salvando..." : "Salvar paciente"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
