"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Package,
  PencilLine,
  Plus,
  PlusCircle,
  ScanLine,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  createMaterialFromRequestAction,
  createPatientFromRequestAction,
  createProcedureFromRequestAction,
  createSupplierFromRequestAction,
  listSupplierNamesAction,
  matchSurgeryRequestAction,
  previewCompositionAction,
  readSurgeryRequestPhotoAction,
  searchCatalogMaterialsAction,
} from "@/app/(dashboard)/surgeries/request-reader-actions";
import type {
  Confidence,
  ProcedureSuggestion,
  RequestAnalysis,
  RequestExtraction,
} from "@/lib/surgery-request-types";
import { searchTussCodesAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { TussResult } from "@/lib/tuss";
import { formatCompositionCode } from "@/lib/compositions/signature";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GuideImageViewer } from "@/components/surgeries/guide-image-viewer";

export type ReaderApplyResult = {
  patientId: string | null;
  procedureIds: string[];
  clinicalIndication: string | null;
  /** Texto do campo Observação/Justificativa da guia (opcional) */
  observations: string | null;
  materials: { id: string; name: string; quantity: number; supplier_id: string | null; supplier_name: string | null }[];
  /** Procedimentos cadastrados agora, a partir da guia (precisam entrar nas opções do formulário). */
  createdProcedures: { id: string; name: string; tuss_code: string | null }[];
  /** Paciente cadastrado agora (cadastro inicial) — precisa entrar nas opções do formulário. */
  createdPatient: { id: string; full_name: string } | null;
  /** Foto da guia (já reduzida) para anexar à cirurgia ao salvar. */
  guideFile: File | null;
};

// ----------------------------------------------------------------------------
// Imagem
// ----------------------------------------------------------------------------

const MAX_SIDE = 1800;

/** Reduz a foto (celular gera arquivos de vários MB) antes de enviar. */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) throw new Error("resize");
  return new File([blob], "pedido.jpg", { type: "image/jpeg" });
}

// ----------------------------------------------------------------------------
// Rascunho editável (etapa 2) — guarda o valor original da IA para saber o que foi corrigido
// ----------------------------------------------------------------------------

type DraftProcedure = { id: string; code: string; description: string; conf: Confidence; origCode: string; origDesc: string };
type DraftMaterial = { id: string; name: string; quantity: string; details: string; supplier: string; conf: Confidence; origName: string; origDetails: string };
type Draft = {
  patientName: string;
  origPatientName: string;
  patientConf: Confidence;
  indication: string;
  indicationConf: Confidence;
  observations: string;
  procedures: DraftProcedure[];
  materials: DraftMaterial[];
  notes: string[];
};

let uid = 0;
const nextId = () => `r${++uid}`;

function toDraft(e: RequestExtraction): Draft {
  return {
    patientName: e.patient_name ?? "",
    origPatientName: e.patient_name ?? "",
    patientConf: e.patient_confidence,
    indication: e.clinical_indication ?? "",
    indicationConf: e.indication_confidence,
    observations: e.observations ?? "",
    procedures: e.procedures.map((p) => ({
      id: nextId(),
      code: p.tuss_code ?? "",
      description: p.description,
      conf: p.confidence,
      origCode: p.tuss_code ?? "",
      origDesc: p.description,
    })),
    materials: e.materials.map((m) => ({
      id: nextId(),
      name: m.name,
      quantity: m.quantity ? String(m.quantity) : "1",
      details: m.details ?? "",
      supplier: m.supplier ?? "",
      conf: m.confidence,
      origName: m.name,
      origDetails: m.details ?? "",
    })),
    notes: e.legibility_notes,
  };
}

const digitsOf = (v: string) => v.replace(/\D/g, "");
const keptProcedures = (d: Draft) => d.procedures.filter((p) => digitsOf(p.code) || p.description.trim());
const keptMaterials = (d: Draft) => d.materials.filter((m) => m.name.trim());

function fromDraft(d: Draft, guideType: RequestExtraction["guide_type"]): RequestExtraction {
  return {
    guide_type: guideType,
    patient_name: d.patientName.trim() || null,
    patient_confidence: d.patientConf,
    clinical_indication: d.indication.trim() || null,
    indication_confidence: d.indicationConf,
    observations: d.observations.trim() || null,
    procedures: keptProcedures(d).map((p) => ({
      tuss_code: digitsOf(p.code) || null,
      description: p.description.trim(),
      confidence: p.conf,
    })),
    materials: keptMaterials(d).map((m) => {
      const q = Number(m.quantity.replace(",", "."));
      return { name: m.name.trim(), quantity: q > 0 ? q : null, details: m.details.trim() || null, supplier: m.supplier.trim() || null, confidence: m.conf };
    }),
    legibility_notes: [],
  };
}

// ----------------------------------------------------------------------------
// Peças visuais
// ----------------------------------------------------------------------------

type Tone = "ok" | "warn" | "info" | "muted" | "alert";
const TONE: Record<Tone, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  info: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  muted: "border-border bg-muted/50 text-muted-foreground",
  alert: "border-amber-500 bg-amber-500/25 font-semibold text-amber-900 dark:text-amber-200",
};

function Chip({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 [&_svg]:h-3 [&_svg]:w-3", TONE[tone])}>
      {icon}
      {children}
    </span>
  );
}

const CONF_LABEL: Record<Confidence, string> = { high: "Confiança alta", medium: "Confiança média", low: "Confiança baixa" };
function ConfChip({ c }: { c: Confidence }) {
  return (
    <Chip tone={c === "high" ? "ok" : c === "medium" ? "warn" : "warn"} icon={<Sparkles />}>
      {CONF_LABEL[c]}
      {c !== "high" ? " · revisar" : ""}
    </Chip>
  );
}

type Kind = "procedure" | "material" | "neutral";
const KIND: Record<Kind, { bar: string; icon: string; label: string | null; labelCls: string }> = {
  procedure: { bar: "border-l-4 border-l-sky-500", icon: "bg-sky-500/15 text-sky-600 dark:text-sky-300", label: "PROCEDIMENTOS", labelCls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  material: { bar: "border-l-4 border-l-violet-500", icon: "bg-violet-500/15 text-violet-600 dark:text-violet-300", label: "MATERIAIS / OPME", labelCls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  neutral: { bar: "", icon: "bg-primary/10 text-primary", label: null, labelCls: "" },
};

function Section({
  icon,
  title,
  right,
  kind = "neutral",
  pending,
  children,
}: {
  icon: ReactNode;
  title: string;
  right?: ReactNode;
  kind?: Kind;
  /** Itens ainda sem cadastro neste bloco (destacado em alerta) */
  pending?: { count: number; noun: string };
  children: ReactNode;
}) {
  const k = KIND[kind];
  return (
    <section className={cn("rounded-xl border border-border bg-card p-3 sm:p-4", k.bar)}>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md [&_svg]:h-4 [&_svg]:w-4", k.icon)}>{icon}</span>
          {title}
          {k.label ? <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide", k.labelCls)}>{k.label}</span> : null}
        </h3>
        {right}
      </div>
      {pending && pending.count > 0 ? (
        <p className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200" role="status">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {pending.count} {pending.count === 1 ? `${pending.noun} sem cadastro` : `${pending.noun}s sem cadastro`} no catálogo — cadastre para poder incluir.
        </p>
      ) : null}
      {children}
    </section>
  );
}

function Line({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <span className="mt-0.5 shrink-0 [&_svg]:h-3 [&_svg]:w-3">{icon}</span>
      <span className="min-w-0">
        <span className="font-medium">{label}:</span> <span className="text-foreground/90">{children}</span>
      </span>
    </p>
  );
}

const inputCls = "h-9 min-w-0 rounded-md border border-input bg-input-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const STEPS = [
  { id: "upload", label: "Documento" },
  { id: "validate", label: "Conferir leitura" },
  { id: "match", label: "Confirmação" },
] as const;
type Step = (typeof STEPS)[number]["id"];

function Stepper({ step }: { step: Step }) {
  const idx = STEPS.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Etapas">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s.id} className="flex items-center gap-2 sm:gap-3" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                current && "border-primary bg-primary text-primary-foreground",
                done && "border-primary/60 bg-primary/15 text-primary",
                !current && !done && "border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-xs sm:text-sm", current ? "font-semibold text-foreground" : "text-muted-foreground", !current && "hidden sm:inline")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 ? <span className="hidden h-px w-6 bg-border sm:block lg:w-12" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

// ----------------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------------

type CreatedProcedure = ReaderApplyResult["createdProcedures"][number];

export function RequestReader({ onApply }: { onApply: (result: ReaderApplyResult) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [guideFile, setGuideFile] = useState<File | null>(null);
  const [guideType, setGuideType] = useState<RequestExtraction["guide_type"]>("outro");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [comp, setComp] = useState<Awaited<ReturnType<typeof previewCompositionAction>> | null>(null);
  const [analysis, setAnalysis] = useState<RequestAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Etapa 3: escolhas e metadados
  const [procEdited, setProcEdited] = useState<Record<string, boolean>>({});
  const [matEdited, setMatEdited] = useState<Record<string, boolean>>({});
  const [patientEdited, setPatientEdited] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [procChecked, setProcChecked] = useState<Record<string, boolean>>({});
  const [procSource, setProcSource] = useState<Record<string, "chosen" | "created">>({});
  const [matChecked, setMatChecked] = useState<Record<string, boolean>>({});
  const [matChoice, setMatChoice] = useState<Record<string, string>>({});
  const [useIndication, setUseIndication] = useState(true);
  const [useObservations, setUseObservations] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [createdProcedures, setCreatedProcedures] = useState<CreatedProcedure[]>([]);
  const [createdPatient, setCreatedPatient] = useState<ReaderApplyResult["createdPatient"]>(null);
  const [patientForm, setPatientForm] = useState<{ name: string } | null>(null);
  const [procForm, setProcForm] = useState<{ key: string; name: string; code: string; specialty: string } | null>(null);
  const [catalog, setCatalog] = useState<{ key: string; query: string; loading: boolean; results: { id: string; name: string }[] | null } | null>(null);
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  // Busca na TUSS (procedimentos) dentro do formulário de cadastro
  const [procTuss, setProcTuss] = useState<{ query: string; loading: boolean; results: TussResult[] | null; error: string | null }>({
    query: "",
    loading: false,
    results: null,
    error: null,
  });

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStep("upload");
    setDraft(null);
    setConfirmed(false);
    setAnalysis(null);
    setError(null);
    setCatalog(null);
    setProcForm(null);
    setPatientForm(null);
    setCreatedProcedures([]);
    setCreatedPatient(null);
    setProcSource({});
  }

  // ETAPA 1 → 2: a IA lê a foto
  function handleFile(file: File | undefined) {
    if (!file) return;
    reset();
    startTransition(async () => {
      try {
        const small = await shrinkImage(file);
        setPreview(URL.createObjectURL(small));
        setGuideFile(small);
        const fd = new FormData();
        fd.set("image", small);
        const res = await readSurgeryRequestPhotoAction(fd);
        if (res.error || !res.extraction) {
          setError(res.error ?? "Não foi possível ler a imagem.");
          return;
        }
        setGuideType(res.extraction.guide_type);
        setDraft(toDraft(res.extraction));
        setStep("validate");
      } catch {
        setError("Não foi possível processar a imagem. Tente outra foto.");
      }
    });
  }

  // ETAPA 2 → 3: com os dados validados, busca no sistema
  function advance() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = await matchSurgeryRequestAction(fromDraft(draft, guideType));
      if (res.error || !res.analysis) {
        setError(res.error ?? "Não foi possível buscar no cadastro.");
        return;
      }
      const a = res.analysis;
      const keptP = keptProcedures(draft);
      const keptM = keptMaterials(draft);
      setAnalysis(a);
      setPatientEdited(draft.patientName.trim() !== draft.origPatientName.trim());
      setProcEdited(Object.fromEntries(a.procedures.map((p, i) => [p.key, keptP[i] ? keptP[i].code !== keptP[i].origCode || keptP[i].description !== keptP[i].origDesc : false])));
      setMatEdited(Object.fromEntries(a.materials.map((m, i) => [m.key, m.source === "guide" && keptM[i] ? keptM[i].name !== keptM[i].origName || keptM[i].details !== keptM[i].origDetails : false])));
      setPatientId(a.patient.patient?.id ?? "");
      setProcChecked(Object.fromEntries(a.procedures.map((p) => [p.key, Boolean(p.procedure)])));
      setProcSource({});
      setMatChecked(Object.fromEntries(a.materials.map((m) => [m.key, m.source === "guide" && !!m.material])));
      setMatChoice(Object.fromEntries(a.materials.map((m) => [m.key, m.material?.id ?? ""])));
      setUseIndication(Boolean(a.clinical_indication));
      setUseObservations(Boolean(a.observations));
        setCatalog(null);
      setProcForm(null);
      setPatientForm(null);
      setStep("match");
    });
  }

  // --- Paciente ---------------------------------------------------------------
  async function savePatient() {
    if (!patientForm || creating) return;
    setCreating("patient");
    const res = await createPatientFromRequestAction({ full_name: patientForm.name });
    setCreating(null);
    if (res.error || !res.patient) {
      toast.error(res.error ?? "Não foi possível cadastrar o paciente.");
      return;
    }
    const patient = res.patient;
    setCreatedPatient({ id: patient.id, full_name: patient.full_name });
    setAnalysis((a) =>
      a ? { ...a, patient: { ...a.patient, match: "exact", patient: { id: patient.id, full_name: patient.full_name }, alternatives: [] } } : a
    );
    setPatientId(patient.id);
    setPatientForm(null);
    toast.success(
      patient.existing
        ? `Já existia um paciente com esse nome: ${patient.full_name}.`
        : `Paciente cadastrado: ${patient.full_name}. Complete os dados depois na ficha.`
    );
  }

  // --- Procedimentos ----------------------------------------------------------
  function linkProcedure(key: string, item: { id: string; name: string; tuss_code: string | null }, source: "chosen" | "created") {
    setAnalysis((a) =>
      a ? { ...a, procedures: a.procedures.map((x) => (x.key === key ? { ...x, procedure: item, match: "exact" as const } : x)) } : a
    );
    setProcSource((s) => ({ ...s, [key]: source }));
    setProcChecked((s) => ({ ...s, [key]: true }));
  }

  async function searchProcTuss(query: string) {
    setProcTuss({ query, loading: true, results: null, error: null });
    const res = await searchTussCodesAction(query);
    setProcTuss((cur) => (cur.query === query ? { ...cur, loading: false, results: res.results ?? [], error: res.error ?? null } : cur));
  }

  function openProcForm(p: ProcedureSuggestion) {
    setProcForm({
      key: p.key,
      name: p.tuss_official_name ?? p.read_description,
      code: p.read_code ?? "",
      specialty: "",
    });
    // Já busca na TUSS pelo que foi lido, para o usuário conferir/escolher o código certo.
    void searchProcTuss(p.read_description || p.read_code || "");
  }

  async function saveProcedure() {
    if (!procForm || creating) return;
    setCreating(procForm.key);
    const res = await createProcedureFromRequestAction({
      code: digitsOf(procForm.code) || null,
      description: procForm.name,
      name: procForm.name,
      specialty: procForm.specialty,
    });
    setCreating(null);
    if (res.error || !res.item) {
      toast.error(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    const item = res.item;
    setCreatedProcedures((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]));
    linkProcedure(procForm.key, item, "created");
    setProcForm(null);
    toast.success(res.existing ? `Já existia um procedimento com esse código TUSS: ${item.name}.` : `Procedimento cadastrado: ${item.name}`);
  }

  // --- Materiais --------------------------------------------------------------
  async function runCatalogSearch(key: string, query: string) {
    setCatalog({ key, query, loading: true, results: null });
    const res = await searchCatalogMaterialsAction(query);
    setCatalog((cur) => (cur && cur.key === key ? { ...cur, loading: false, results: res.results } : cur));
  }

  function chooseCatalogMaterial(key: string, item: { id: string; name: string }) {
    setAnalysis((a) =>
      a
        ? {
            ...a,
            materials: a.materials.map((x) =>
              x.key === key && x.material?.id !== item.id && !x.alternatives.some((alt) => alt.id === item.id)
                ? { ...x, alternatives: [item, ...x.alternatives] }
                : x
            ),
          }
        : a
    );
    setMatChoice((s) => ({ ...s, [key]: item.id }));
    setMatChecked((s) => ({ ...s, [key]: true }));
    setCatalog(null);
  }

  /** Cadastra o material conforme a descrição preenchida na conferência (sem consultar a TUSS). */
  async function createMaterial(key: string) {
    const m = analysis?.materials.find((x) => x.key === key);
    if (!m || creating) return;
    setCreating(key);
    const res = await createMaterialFromRequestAction({ name: m.read_name, details: m.details, supplierId: m.supplier?.id ?? null });
    setCreating(null);
    if (res.error || !res.item) {
      toast.error(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    const item = res.item;
    setCatalog(null);
    setAnalysis((a) => (a ? { ...a, materials: a.materials.map((x) => (x.key === key ? { ...x, material: { id: item.id, name: item.name } } : x)) } : a));
    setMatChoice((s) => ({ ...s, [key]: item.id }));
    setMatChecked((s) => ({ ...s, [key]: true }));
    toast.success(res.existing ? `Já existia no catálogo: ${item.name}.` : `Material cadastrado: ${item.name}`);
  }

  /** Cadastro inicial do fornecedor informado (só o nome). */
  async function createSupplier(key: string) {
    const m = analysis?.materials.find((x) => x.key === key);
    if (!m?.supplier_text || creating) return;
    setCreating(`sup-${key}`);
    const res = await createSupplierFromRequestAction({ name: m.supplier_text });
    setCreating(null);
    if (res.error || !res.supplier) {
      toast.error(res.error ?? "Não foi possível cadastrar o fornecedor.");
      return;
    }
    const sup = res.supplier;
    setAnalysis((a) => (a ? { ...a, materials: a.materials.map((x) => (x.supplier_text && x.supplier_text.toLowerCase() === m.supplier_text!.toLowerCase() ? { ...x, supplier: sup } : x)) } : a));
    setSupplierNames((n) => (n.includes(sup.name) ? n : [...n, sup.name]));
    toast.success(`Fornecedor cadastrado: ${sup.name}. Complete os dados depois em Fornecedores.`);
  }

  // --- Resumo e aplicação -----------------------------------------------------
  const selectedProcedures = analysis ? analysis.procedures.filter((p) => procChecked[p.key] && p.procedure) : [];
  const selectedMaterials = analysis ? analysis.materials.filter((m) => matChecked[m.key] && matChoice[m.key]) : [];
  const patientName = analysis
    ? ([analysis.patient.patient, ...analysis.patient.alternatives].find((p) => p?.id === patientId)?.full_name ?? createdPatient?.full_name ?? null)
    : null;

  // Regra de composições: consulta se a combinação (procedimentos + materiais +
  // quantidades) já existe e deve ser reutilizada. Não grava nada.
  const compKey = JSON.stringify([
    selectedProcedures.map((p) => p.procedure!.id).sort(),
    selectedMaterials.map((m) => [matChoice[m.key], m.quantity]).sort(),
  ]);
  useEffect(() => {
    if (step !== "match") return;
    const [procIds, mats] = JSON.parse(compKey) as [string[], [string, number][]];
    if (procIds.length === 0) return;
    let cancelled = false;
    void previewCompositionAction({ procedureIds: procIds, materials: mats.map(([id, quantity]) => ({ id, quantity })) }).then((r) => {
      if (!cancelled) setComp(r);
    });
    return () => {
      cancelled = true;
    };
  }, [compKey, step]);

  function applyExistingComposition(c: NonNullable<NonNullable<typeof comp>["existing"]>[number]) {
    setAnalysis((a) => {
      if (!a) return a;
      const have = new Set(a.materials.map((m) => matChoice[m.key] || m.material?.id).filter(Boolean));
      const extra = c.materials
        .filter((m) => !have.has(m.material_id))
        .map((m) => ({
          key: `c${c.number}-${m.material_id}`,
          source: "kit" as const,
          read_name: m.name,
          confidence: "high" as Confidence,
          quantity: m.quantity,
          details: null,
          supplier_text: null,
          supplier: null,
          material: { id: m.material_id, name: m.name },
          alternatives: [],
        }));
      return { ...a, materials: [...a.materials, ...extra] };
    });
    const ids = Object.fromEntries(c.materials.map((m) => [`c${c.number}-${m.material_id}`, m.material_id]));
    setMatChoice((x) => ({ ...x, ...ids }));
    setMatChecked((x) => ({ ...x, ...Object.fromEntries(Object.keys(ids).map((k) => [k, true])) }));
    toast.success(`Materiais da composição ${formatCompositionCode(c.number)} incluídos. Confira as quantidades.`);
  }

  function apply() {
    if (!analysis) return;
    const materials = selectedMaterials.map((m) => {
      const id = matChoice[m.key];
      const name = m.material?.id === id ? m.material.name : (m.alternatives.find((a) => a.id === id)?.name ?? m.read_name);
      return { id, name, quantity: m.quantity, supplier_id: m.supplier?.id ?? null, supplier_name: m.supplier?.name ?? null };
    });
    onApply({
      patientId: patientId || null,
      procedureIds: selectedProcedures.map((p) => p.procedure!.id),
      clinicalIndication: useIndication ? analysis.clinical_indication : null,
      observations: useObservations ? analysis.observations : null,
      materials,
      createdProcedures,
      createdPatient,
      guideFile: guideFile ? new File([guideFile], "guia-pedido-cirurgico.jpg", { type: guideFile.type || "image/jpeg" }) : null,
    });
    toast.success("Dados do pedido aplicados. Revise o formulário antes de salvar.");
    setOpen(false);
    reset();
  }

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setConfirmed(false);
  }
  const patchProc = (id: string, f: Partial<DraftProcedure>) =>
    patch("procedures", (draft?.procedures ?? []).map((x) => (x.id === id ? { ...x, ...f } : x)));
  const patchMat = (id: string, f: Partial<DraftMaterial>) =>
    patch("materials", (draft?.materials ?? []).map((x) => (x.id === id ? { ...x, ...f } : x)));

  // ----------------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------------
  return (
    <>
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ScanLine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Preencher a partir da foto do pedido</p>
            <p className="text-xs text-muted-foreground">
              A IA lê a guia e sugere paciente, procedimentos e materiais. Você confere cada etapa antes de salvar.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={() => {
            setOpen(true);
            void listSupplierNamesAction().then((r) => setSupplierNames(r.names));
          }}
        >
          <Camera className="mr-2 h-4 w-4" />
          Ler pedido por foto
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (pending || creating) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="flex h-[94vh] max-h-[94vh] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-3 border-b border-border px-4 pb-3 pt-4 sm:px-6">
            <div className="flex items-start gap-3 pr-10">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle>Leitura de guia por IA</DialogTitle>
                <DialogDescription>Foto enviada ao serviço de IA só para a leitura; não é guardada.</DialogDescription>
              </div>
            </div>
            <Stepper step={step} />
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* Corpo rolável */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {step === "upload" ? (
              <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-7 w-7" />
                </span>
                {pending ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" /> Lendo o pedido… pode levar até 30 segundos.
                  </p>
                ) : (
                  <>
                    <div>
                      <p className="text-base font-semibold text-foreground">Envie a foto da guia</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        De frente, bem iluminada e com a guia inteira na imagem. Aceita JPG, PNG ou WebP.
                      </p>
                    </div>
                    <Button type="button" className="h-11" onClick={() => inputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      Escolher foto ou tirar agora
                    </Button>
                  </>
                )}
                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step !== "upload" && draft ? (
              <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
                {preview ? <GuideImageViewer src={preview} className="lg:sticky lg:top-0 lg:self-start" /> : null}

                {/* ============ ETAPA 2: conferir a leitura ============ */}
                {step === "validate" ? (
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">Dados extraídos da foto</p>
                        <p className="text-xs text-muted-foreground">
                          Compare com a guia ao lado e corrija o que estiver errado. Só depois de confirmar o sistema
                          busca e cadastra paciente, procedimentos e materiais.
                        </p>
                      </div>
                    </div>

                    {draft.notes.length > 0 ? (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                        <p className="mb-1 flex items-center gap-1.5 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" /> A IA ficou em dúvida nestes pontos:
                        </p>
                        <ul className="list-inside list-disc">
                          {draft.notes.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <Section icon={<User />} title="Paciente" right={<ConfChip c={draft.patientConf} />}>
                      <input
                        className={cn(inputCls, "h-10 w-full")}
                        value={draft.patientName}
                        onChange={(e) => patch("patientName", e.target.value)}
                        placeholder="Nome completo, como está na guia"
                        aria-label="Nome do paciente"
                      />
                    </Section>

                    <Section icon={<Stethoscope />} title="Indicação clínica" right={<ConfChip c={draft.indicationConf} />}>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={draft.indication}
                        onChange={(e) => patch("indication", e.target.value)}
                        aria-label="Indicação clínica"
                      />
                    </Section>

                    <Section kind="procedure" icon={<ClipboardList />} title="Procedimentos identificados" right={<span className="text-xs text-muted-foreground">código TUSS + descrição</span>}>
                      <div className="flex flex-col gap-2">
                        {draft.procedures.map((p) => {
                          const digits = digitsOf(p.code);
                          const doubt = p.conf !== "high" || (digits.length > 0 && digits.length !== 8);
                          return (
                            <div key={p.id} className={cn("rounded-lg border p-2", doubt ? "border-amber-500/40 bg-amber-500/5" : "border-border")}>
                              <div className="flex gap-2">
                                <input
                                  className={cn(inputCls, "w-28 shrink-0 font-mono")}
                                  inputMode="numeric"
                                  value={p.code}
                                  maxLength={10}
                                  placeholder="código"
                                  aria-label="Código TUSS"
                                  onChange={(e) => patchProc(p.id, { code: e.target.value })}
                                />
                                <input
                                  className={cn(inputCls, "flex-1")}
                                  value={p.description}
                                  placeholder="descrição"
                                  aria-label="Descrição do procedimento"
                                  onChange={(e) => patchProc(p.id, { description: e.target.value })}
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Remover procedimento" onClick={() => patch("procedures", draft.procedures.filter((x) => x.id !== p.id))}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <ConfChip c={p.conf} />
                                {digits && digits.length !== 8 ? <Chip tone="warn" icon={<AlertTriangle />}>Código TUSS tem 8 dígitos</Chip> : null}
                              </div>
                            </div>
                          );
                        })}
                        <Button type="button" variant="outline" size="sm" className="h-8 w-fit" onClick={() => patch("procedures", [...draft.procedures, { id: nextId(), code: "", description: "", conf: "high", origCode: "", origDesc: "" }])}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar procedimento
                        </Button>
                      </div>
                    </Section>

                    <Section kind="material" icon={<Package />} title="Materiais / OPME citados" right={<span className="text-xs text-muted-foreground">marca e fornecedor são opcionais</span>}>
                      <datalist id="rd-suppliers">
                        {supplierNames.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                      <div className="flex flex-col gap-2">
                        {draft.materials.map((m) => (
                          <div key={m.id} className={cn("rounded-lg border p-2", m.conf !== "high" ? "border-amber-500/40 bg-amber-500/5" : "border-border")}>
                            <div className="flex flex-wrap gap-2">
                              <input className={cn(inputCls, "min-w-40 flex-1")} value={m.name} placeholder="material" aria-label="Nome do material" onChange={(e) => patchMat(m.id, { name: e.target.value })} />
                              <input className={cn(inputCls, "w-16 shrink-0")} inputMode="decimal" value={m.quantity} aria-label="Quantidade" onChange={(e) => patchMat(m.id, { quantity: e.target.value })} />
                              <input className={cn(inputCls, "min-w-32 flex-1")} value={m.details} placeholder="marca / medida (opcional)" aria-label="Marca ou medida" onChange={(e) => patchMat(m.id, { details: e.target.value })} />
                              <input className={cn(inputCls, "min-w-32 flex-1")} value={m.supplier} list="rd-suppliers" placeholder="fornecedor (opcional)" aria-label="Fornecedor" onChange={(e) => patchMat(m.id, { supplier: e.target.value })} />
                              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Remover material" onClick={() => patch("materials", draft.materials.filter((x) => x.id !== m.id))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-1.5">
                              <ConfChip c={m.conf} />
                            </div>
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" className="h-8 w-fit" onClick={() => patch("materials", [...draft.materials, { id: nextId(), name: "", quantity: "1", details: "", supplier: "", conf: "high", origName: "", origDetails: "" }])}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar material
                        </Button>
                      </div>
                    </Section>

                    <Section icon={<FileText />} title="Observações da guia">
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-input-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={draft.observations}
                        onChange={(e) => patch("observations", e.target.value)}
                        placeholder="Campo Observação / Justificativa, como escrito"
                        aria-label="Observações da guia"
                      />
                    </Section>

                    {error ? (
                      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                        {error}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* ============ ETAPA 3: confirmação ============ */}
                {step === "match" && analysis ? (
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Lido da foto</span>
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Catálogo / TUSS</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Você conferiu os dados na etapa anterior</span>
                    </div>

                    {/* Situação da composição (procedimentos + materiais) */}
                    {comp?.preview && comp.preview.status !== "unavailable" ? (
                      <div
                        role="status"
                        className={cn(
                          "flex items-start gap-3 rounded-xl border-2 p-3 text-sm",
                          comp.preview.status === "reused"
                            ? "border-emerald-500/60 bg-emerald-500/10"
                            : comp.preview.status === "variant"
                              ? "border-sky-500/60 bg-sky-500/10"
                              : "border-primary/50 bg-primary/10"
                        )}
                      >
                        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-foreground">
                            {comp.preview.status === "reused"
                              ? `Composição ${formatCompositionCode(comp.preview.number ?? 0)} já cadastrada — será reutilizada`
                              : comp.preview.status === "variant"
                                ? "Kit diferente dos anteriores — será salvo como nova composição"
                                : "Nova composição — será cadastrada ao salvar a cirurgia"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {comp.preview.status === "reused"
                              ? `Mesmos procedimentos, materiais e quantidades${comp.preview.uses ? ` (usada em ${comp.preview.uses} guia(s))` : ""}. Nenhum cadastro duplicado será criado.`
                              : comp.preview.status === "variant"
                                ? `Estes procedimentos já têm ${comp.preview.variants} kit(s) salvo(s), mas com materiais ou quantidades diferentes dos desta guia (compare abaixo). Ao salvar, este kit fica registrado para reutilização futura.`
                                : "Esta combinação de procedimentos e materiais ainda não existe. Ela será registrada e poderá ser reutilizada nas próximas guias."}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Paciente */}
                    <Section
                      icon={<User />}
                      title="Paciente"
                      right={
                        patientId ? (
                          <Chip tone="ok" icon={<CheckCircle2 />}>{analysis.patient.match === "exact" && !createdPatient ? "Encontrado no cadastro" : "Selecionado"}</Chip>
                        ) : analysis.patient.alternatives.length > 0 ? (
                          <Chip tone="warn" icon={<AlertTriangle />}>Necessita revisão</Chip>
                        ) : (
                          <Chip tone="info" icon={<PlusCircle />}>Paciente não encontrado</Chip>
                        )
                      }
                    >
                      <div className="flex flex-col gap-2">
                        <Line icon={<Sparkles />} label="Lido na foto">
                          {analysis.patient.read_name ?? "não identificado"} {patientEdited ? <Chip tone="muted" icon={<PencilLine />}>Corrigido</Chip> : null}{" "}
                          {!patientEdited ? <ConfChip c={analysis.patient.confidence} /> : null}
                        </Line>
                        {analysis.patient.patient || analysis.patient.alternatives.length > 0 ? (
                          <select
                            className={cn(inputCls, "h-10 w-full")}
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                            aria-label="Paciente cadastrado correspondente"
                          >
                            <option value="">Não vincular / escolher depois</option>
                            {[analysis.patient.patient, ...analysis.patient.alternatives]
                              .filter((p): p is { id: string; full_name: string } => Boolean(p))
                              .map((p) => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                              ))}
                          </select>
                        ) : null}
                        {analysis.patient.match === "similar" && !patientId ? (
                          <p className="text-xs text-amber-700 dark:text-amber-400">Há pacientes com nome parecido. Escolha o correto ou cadastre um novo.</p>
                        ) : null}
                        {!analysis.patient.patient && analysis.patient.read_name ? (
                          patientForm ? (
                            <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                              <p className="mb-1.5 text-xs text-muted-foreground">
                                Cadastro inicial: grava só o nome. CPF, nascimento, contato e convênio você completa depois na ficha do paciente.
                              </p>
                              <input
                                className={cn(inputCls, "h-10 w-full")}
                                value={patientForm.name}
                                onChange={(e) => setPatientForm({ name: e.target.value })}
                                aria-label="Nome do paciente a cadastrar"
                              />
                              <div className="mt-2 flex gap-2">
                                <Button type="button" size="sm" className="h-8" disabled={creating !== null} onClick={savePatient}>
                                  {creating === "patient" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                                  Salvar paciente
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setPatientForm(null)}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <Button type="button" variant="outline" size="sm" className="h-8 w-fit" onClick={() => setPatientForm({ name: analysis.patient.read_name ?? "" })}>
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Cadastrar paciente (cadastro inicial)
                            </Button>
                          )
                        ) : null}
                      </div>
                    </Section>

                    {/* Indicação e observações */}
                    {analysis.clinical_indication || analysis.observations ? (
                      <Section icon={<Stethoscope />} title="Indicação clínica e observações">
                        <div className="flex flex-col gap-2 text-sm">
                          {analysis.clinical_indication ? (
                            <label className="flex items-start gap-2">
                              <input type="checkbox" className="mt-1" checked={useIndication} onChange={(e) => setUseIndication(e.target.checked)} />
                              <span><span className="font-medium">Indicação:</span> {analysis.clinical_indication}</span>
                            </label>
                          ) : null}
                          {analysis.observations ? (
                            <label className="flex items-start gap-2">
                              <input type="checkbox" className="mt-1" checked={useObservations} onChange={(e) => setUseObservations(e.target.checked)} />
                              <span><span className="font-medium">Observações da guia:</span> {analysis.observations}</span>
                            </label>
                          ) : null}
                          <p className="text-xs text-muted-foreground">Os itens marcados vão para as observações da cirurgia.</p>
                        </div>
                      </Section>
                    ) : null}

                    {/* Procedimentos */}
                    <Section
                      kind="procedure"
                      pending={{ count: analysis.procedures.filter((p) => !p.procedure).length, noun: "procedimento" }}
                      icon={<ClipboardList />}
                      title="Procedimentos"
                      right={<span className="text-xs text-muted-foreground">{selectedProcedures.length} de {analysis.procedures.length} selecionado(s)</span>}
                    >
                      <ul className="flex flex-col gap-2">
                        {analysis.procedures.map((p) => {
                          const checked = Boolean(procChecked[p.key]);
                          const digits = digitsOf(p.read_code ?? "");
                          const userLinked = procSource[p.key];
                          const lowConf = p.confidence === "low" && !userLinked && !procEdited[p.key];
                          const review = !p.procedure && (Boolean(p.suggestion) || p.tuss_code_unknown || p.confidence !== "high" || (digits.length > 0 && digits.length !== 8));
                          let status: ReactNode;
                          if (p.procedure && !lowConf) {
                            status = <Chip tone="ok" icon={<CheckCircle2 />}>{userLinked === "created" ? "Cadastrado agora" : userLinked === "chosen" ? "Vinculado por você" : "Encontrado no catálogo"}</Chip>;
                          } else if (p.procedure) {
                            status = <Chip tone="warn" icon={<AlertTriangle />}>Necessita revisão</Chip>;
                          } else {
                            status = (
                              <>
                                <Chip tone="alert" icon={<PlusCircle />}>Não cadastrado no catálogo</Chip>
                                {review ? <Chip tone="warn" icon={<AlertTriangle />}>Necessita revisão</Chip> : null}
                              </>
                            );
                          }
                          return (
                            <li
                              key={p.key}
                              className={cn(
                                "rounded-xl border p-3",
                                !p.procedure ? "border-2 border-dashed border-amber-500 bg-amber-500/10" : checked ? "border-sky-500/60 bg-sky-500/5" : "border-border"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  disabled={!p.procedure}
                                  checked={checked}
                                  onChange={(e) => setProcChecked((s) => ({ ...s, [p.key]: e.target.checked }))}
                                  aria-label={`Incluir ${p.procedure?.name ?? p.read_description ?? "procedimento"}`}
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">{p.procedure?.name ?? p.tuss_official_name ?? (p.read_description || "Procedimento sem descrição")}</p>
                                    {status}
                                  </div>
                                  <Line icon={<Sparkles />} label="Lido na foto">
                                    {p.read_code ? <span className="font-mono">{p.read_code}</span> : "sem código"} · {p.read_description || "—"}{" "}
                                    {procEdited[p.key] ? <Chip tone="muted" icon={<PencilLine />}>Corrigido</Chip> : <ConfChip c={p.confidence} />}
                                  </Line>
                                  {p.tuss_official_name ? <Line icon={<BookOpen />} label="TUSS oficial">{p.tuss_official_name}</Line> : null}
                                  {p.tuss_code_unknown ? (
                                    <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3 w-3" /> Código não existe na TUSS — possível erro de leitura. Volte e corrija.</p>
                                  ) : null}
                                  {p.suggestion && !p.procedure ? (
                                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
                                      <span className="min-w-0 flex-1">Possível correspondência (só pelo nome): <span className="font-medium text-foreground">{p.suggestion.name}</span>{p.suggestion.tuss_code ? ` · TUSS ${p.suggestion.tuss_code}` : " · sem código TUSS"}</span>
                                      <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => linkProcedure(p.key, p.suggestion!, "chosen")}>Usar este</Button>
                                    </div>
                                  ) : null}
                                  {!p.procedure && procForm?.key !== p.key ? (
                                    <Button type="button" variant="outline" size="sm" className="mt-1 h-8 w-fit" disabled={creating !== null} onClick={() => openProcForm(p)}>
                                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Cadastrar no catálogo
                                    </Button>
                                  ) : null}
                                  {procForm?.key === p.key ? (
                                    <div className="mt-1 rounded-lg border border-border bg-muted/30 p-2.5">
                                      <p className="mb-2 text-xs font-medium text-foreground">Revise antes de cadastrar</p>
                                      <div className="mb-2 flex flex-col gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/5 p-2">
                                        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><BookOpen className="h-3.5 w-3.5" /> Buscar na tabela TUSS</p>
                                        <div className="flex gap-2">
                                          <input
                                            className={cn(inputCls, "flex-1")}
                                            value={procTuss.query}
                                            placeholder="Nome ou código do procedimento"
                                            aria-label="Buscar procedimento na TUSS"
                                            onChange={(e) => setProcTuss((c) => ({ ...c, query: e.target.value }))}
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchProcTuss(procTuss.query); } }}
                                          />
                                          <Button type="button" variant="outline" size="sm" className="h-9" disabled={procTuss.loading} onClick={() => searchProcTuss(procTuss.query)}>Buscar</Button>
                                        </div>
                                        {procTuss.loading ? <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando a TUSS…</p> : null}
                                        {procTuss.error ? <p className="text-xs text-red-600 dark:text-red-400">{procTuss.error}</p> : null}
                                        {procTuss.results && procTuss.results.length === 0 && !procTuss.error ? <p className="text-xs text-muted-foreground">Nada encontrado. Tente menos palavras ou preencha manualmente abaixo.</p> : null}
                                        <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                                          {(procTuss.results ?? []).map((r) => (
                                            <li key={r.code}>
                                              <button
                                                type="button"
                                                onClick={() => setProcForm((f) => (f ? { ...f, name: r.name, code: r.code } : f))}
                                                className={cn("w-full rounded-md border p-2 text-left text-xs hover:bg-muted", procForm.code === r.code ? "border-sky-500 bg-sky-500/10" : "border-border")}
                                              >
                                                <span className="font-mono">{r.code}</span> · <span className="text-foreground">{r.name}</span>
                                                {!r.active ? <span className="text-amber-700 dark:text-amber-400"> · não vigente</span> : null}
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem]">
                                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                          Nome do procedimento
                                          <input className={cn(inputCls, "h-10 text-foreground")} value={procForm.name} onChange={(e) => setProcForm({ ...procForm, name: e.target.value })} />
                                        </label>
                                        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                                          Código TUSS
                                          <input className={cn(inputCls, "h-10 font-mono text-foreground")} inputMode="numeric" maxLength={8} value={procForm.code} onChange={(e) => setProcForm({ ...procForm, code: e.target.value })} />
                                        </label>
                                      </div>
                                      <label className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                                        Especialidade (opcional)
                                        <input className={cn(inputCls, "h-10 text-foreground")} value={procForm.specialty} onChange={(e) => setProcForm({ ...procForm, specialty: e.target.value })} />
                                      </label>
                                      <p className="mt-1.5 text-xs text-muted-foreground">Se já existir procedimento com este código TUSS, ele será reaproveitado (sem duplicar).</p>
                                      <div className="mt-2 flex gap-2">
                                        <Button type="button" size="sm" className="h-8" disabled={creating !== null || !procForm.name.trim()} onClick={saveProcedure}>
                                          {creating === p.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                          Salvar no catálogo
                                        </Button>
                                        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setProcForm(null)}>Cancelar</Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        {analysis.procedures.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum procedimento lido.</li> : null}
                      </ul>
                    </Section>

                    {/* Composições já cadastradas: comparação com os materiais lidos da guia */}
                    {comp?.existing && comp.existing.length > 0 ? (
                      <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                        <p className="font-semibold text-foreground">Esta combinação de procedimentos já foi usada antes</p>
                        <p className="mt-0.5 text-muted-foreground">
                          Veja abaixo o kit de materiais de cada vez e compare com o que foi lido nesta guia. Nada muda até você clicar em incluir.
                        </p>
                        <ul className="mt-2 flex flex-col gap-2">
                          {comp.existing.map((c) => {
                            const guide = new Map<string, { name: string; qty: number }>();
                            for (const m of selectedMaterials) {
                              const id = matChoice[m.key];
                              const name = m.material?.id === id ? m.material.name : (m.alternatives.find((a) => a.id === id)?.name ?? m.read_name);
                              const prev = guide.get(id);
                              guide.set(id, { name, qty: (prev?.qty ?? 0) + m.quantity });
                            }
                            const kit = new Map(c.materials.map((m) => [m.material_id, m]));
                            const missing = c.materials.filter((m) => !guide.has(m.material_id));
                            const different = c.materials.filter((m) => guide.has(m.material_id) && guide.get(m.material_id)!.qty !== m.quantity);
                            const same = c.materials.filter((m) => guide.has(m.material_id) && guide.get(m.material_id)!.qty === m.quantity);
                            const onlyGuide = [...guide.entries()].filter(([id]) => !kit.has(id));
                            const identical = missing.length === 0 && different.length === 0 && onlyGuide.length === 0;
                            return (
                              <li key={c.id} className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {formatCompositionCode(c.number)} · usada em {c.uses} guia(s)
                                  </span>
                                  {identical ? (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">Igual à guia</span>
                                  ) : missing.length > 0 ? (
                                    <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => applyExistingComposition(c)}>
                                      Incluir {missing.length === 1 ? "o item que falta" : `os ${missing.length} itens que faltam`}
                                    </Button>
                                  ) : null}
                                </div>
                                <ul className="flex flex-col gap-0.5 text-muted-foreground">
                                  {same.map((m) => (
                                    <li key={m.material_id}>✓ {m.quantity}× {m.name} <span className="opacity-70">— já está na guia</span></li>
                                  ))}
                                  {different.map((m) => (
                                    <li key={m.material_id} className="text-amber-700 dark:text-amber-300">
                                      ≠ {m.name} — kit tinha {m.quantity}×, guia tem {guide.get(m.material_id)!.qty}×
                                    </li>
                                  ))}
                                  {missing.map((m) => (
                                    <li key={m.material_id} className="text-sky-700 dark:text-sky-300">
                                      + {m.quantity}× {m.name} <span className="opacity-80">— estava no kit, não está na guia</span>
                                    </li>
                                  ))}
                                  {onlyGuide.map(([id, g]) => (
                                    <li key={id}>
                                      • {g.qty}× {g.name} <span className="opacity-70">— só na guia, não estava no kit</span>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {/* Materiais */}
                    <Section
                      kind="material"
                      pending={{ count: analysis.materials.filter((m) => m.source === "guide" && !matChoice[m.key]).length, noun: "material" }}
                      icon={<Package />}
                      title="Materiais / OPME"
                      right={<span className="text-xs text-muted-foreground">{selectedMaterials.length} de {analysis.materials.length} selecionado(s)</span>}
                    >
                      <ul className="flex flex-col gap-2">
                        {analysis.materials.map((m) => {
                          const chosen = matChoice[m.key];
                          const checked = Boolean(matChecked[m.key]);
                          const isGuide = m.source === "guide";
                          let status: ReactNode;
                          if (chosen) status = <Chip tone="ok" icon={<CheckCircle2 />}>{isGuide ? "No catálogo" : "Kit padrão"}</Chip>;
                          else if (m.alternatives.length > 0) status = (
                            <>
                              <Chip tone="alert" icon={<PlusCircle />}>Não cadastrado no catálogo</Chip>
                              <Chip tone="warn" icon={<AlertTriangle />}>Necessita revisão</Chip>
                            </>
                          );
                          else status = <Chip tone="alert" icon={<PlusCircle />}>Não cadastrado no catálogo</Chip>;
                          return (
                            <li
                              key={m.key}
                              className={cn(
                                "rounded-xl border p-3",
                                isGuide && !chosen ? "border-2 border-dashed border-amber-500 bg-amber-500/10" : checked ? "border-violet-500/60 bg-violet-500/5" : "border-border"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  disabled={!chosen}
                                  checked={checked}
                                  onChange={(e) => setMatChecked((s) => ({ ...s, [m.key]: e.target.checked }))}
                                  aria-label={`Incluir ${m.read_name}`}
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">{isGuide ? m.read_name : m.material?.name} × {m.quantity}</p>
                                    {status}
                                  </div>
                                  {isGuide ? (
                                    <Line icon={<Sparkles />} label="Lido na foto">
                                      {m.read_name}{m.details ? ` · ${m.details}` : ""}{" "}
                                      {matEdited[m.key] ? <Chip tone="muted" icon={<PencilLine />}>Corrigido</Chip> : <ConfChip c={m.confidence} />}
                                    </Line>
                                  ) : (
                                    <Line icon={<BookOpen />} label="Origem">composição já cadastrada (não citado na guia)</Line>
                                  )}
                                  {isGuide && (m.material || m.alternatives.length > 0) ? (
                                    <select
                                      className={cn(inputCls, "w-full text-xs")}
                                      value={chosen ?? ""}
                                      onChange={(e) => {
                                        setMatChoice((s) => ({ ...s, [m.key]: e.target.value }));
                                        setMatChecked((s) => ({ ...s, [m.key]: Boolean(e.target.value) }));
                                      }}
                                      aria-label={`Material do catálogo para ${m.read_name}`}
                                    >
                                      <option value="">{m.material ? "Nenhum" : "Escolha um material do catálogo…"}</option>
                                      {[m.material, ...m.alternatives]
                                        .filter((x): x is { id: string; name: string } => Boolean(x))
                                        .map((x) => (
                                          <option key={x.id} value={x.id}>{x.name}</option>
                                        ))}
                                    </select>
                                  ) : null}
                                  {isGuide && !m.material && m.alternatives.length > 0 && !chosen ? (
                                    <p className="text-xs text-amber-700 dark:text-amber-400">Só há materiais parecidos: nada é vinculado sem você escolher.</p>
                                  ) : null}

                                  {isGuide ? (
                                    m.supplier ? (
                                      <Line icon={<Package />} label="Fornecedor">{m.supplier.name}</Line>
                                    ) : m.supplier_text ? (
                                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span>Fornecedor informado: <span className="text-foreground">{m.supplier_text}</span> (não cadastrado)</span>
                                        <Button type="button" variant="outline" size="sm" className="h-7" disabled={creating !== null} onClick={() => createSupplier(m.key)}>
                                          {creating === `sup-${m.key}` ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                                          Cadastrar fornecedor
                                        </Button>
                                      </div>
                                    ) : null
                                  ) : null}

                                  {isGuide ? (
                                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={creating !== null} onClick={() => void runCatalogSearch(m.key, m.read_name)}>
                                        Buscar no catálogo
                                      </Button>
                                      <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={creating !== null} onClick={() => createMaterial(m.key)}>
                                        {creating === m.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                        {m.material ? "Cadastrar como novo" : "Cadastrar no catálogo"}
                                      </Button>
                                    </div>
                                  ) : null}

                                  {catalog?.key === m.key ? (
                                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                                      <div className="flex gap-2">
                                        <input
                                          className={cn(inputCls, "flex-1")}
                                          value={catalog.query}
                                          placeholder="Nome ou código interno"
                                          aria-label="Buscar no catálogo de materiais"
                                          onChange={(e) => setCatalog((c) => (c ? { ...c, query: e.target.value } : c))}
                                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void runCatalogSearch(m.key, catalog.query); } }}
                                        />
                                        <Button type="button" variant="outline" size="sm" className="h-9" disabled={catalog.loading} onClick={() => runCatalogSearch(m.key, catalog.query)}>Buscar</Button>
                                      </div>
                                      {catalog.loading ? <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…</p> : null}
                                      {catalog.results && catalog.results.length === 0 ? <p className="text-xs text-muted-foreground">Nada encontrado no catálogo com esse termo.</p> : null}
                                      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                                        {(catalog.results ?? []).map((r) => (
                                          <li key={r.id}>
                                            <button type="button" onClick={() => chooseCatalogMaterial(m.key, r)} className="w-full rounded-md border border-border p-2 text-left text-xs text-foreground hover:bg-muted">{r.name}</button>
                                          </li>
                                        ))}
                                      </ul>
                                      <Button type="button" variant="ghost" size="sm" className="h-8 w-fit" onClick={() => setCatalog(null)}>Fechar</Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        {analysis.materials.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum material sugerido.</li> : null}
                      </ul>
                    </Section>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Rodapé fixo */}
          {step === "validate" ? (
            <div className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>Conferi os dados com a foto e estão corretos.</span>
              </label>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="h-10" disabled={pending} onClick={() => { reset(); inputRef.current?.click(); }}>
                  Usar outra foto
                </Button>
                <Button type="button" className="h-10" disabled={pending || !confirmed} onClick={advance}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Confirmar e avançar
                </Button>
              </div>
            </div>
          ) : null}

          {step === "match" && analysis ? (
            <div className="flex flex-col gap-2 border-t border-border bg-card px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-live="polite">
                <span className="font-semibold text-foreground">Resumo da seleção:</span>
                <Chip tone={patientName ? "ok" : "warn"} icon={patientName ? <CheckCircle2 /> : <AlertTriangle />}>
                  {patientName ? `Paciente: ${patientName}` : "Sem paciente vinculado"}
                </Chip>
                <Chip tone={selectedProcedures.length ? "ok" : "warn"}>{selectedProcedures.length} procedimento(s)</Chip>
                <Chip tone="muted">{selectedMaterials.length} material(is)</Chip>
                {comp?.preview && comp.preview.status !== "unavailable" ? (
                  <Chip tone={comp.preview.status === "reused" ? "ok" : comp.preview.status === "variant" ? "info" : "muted"}>
                    {comp.preview.status === "reused"
                      ? `Composição ${formatCompositionCode(comp.preview.number ?? 0)} existente será reutilizada`
                      : comp.preview.status === "variant"
                        ? "Kit novo (difere dos anteriores)"
                        : "Nova composição será cadastrada"}
                  </Chip>
                ) : null}
                {(useIndication && analysis.clinical_indication) || (useObservations && analysis.observations) ? <Chip tone="muted">Indicação/observações incluídas</Chip> : null}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="h-10" disabled={creating !== null} onClick={() => setStep("validate")}>
                  Voltar e corrigir
                </Button>
                <Button type="button" className="h-10" disabled={creating !== null} onClick={apply}>
                  Aplicar ao formulário
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
