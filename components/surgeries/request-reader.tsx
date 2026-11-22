"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, Plus, ScanLine, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  createMaterialFromRequestAction,
  createPatientFromRequestAction,
  createProcedureFromRequestAction,
  matchSurgeryRequestAction,
  readSurgeryRequestPhotoAction,
  searchCatalogMaterialsAction,
} from "@/app/(dashboard)/surgeries/request-reader-actions";
import { searchTussMaterialsAction } from "@/app/(dashboard)/catalog/materials/actions";
import type { TussResult } from "@/lib/tuss";
import type { RequestAnalysis, RequestExtraction } from "@/lib/surgery-request-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReaderApplyResult = {
  patientId: string | null;
  procedureIds: string[];
  clinicalIndication: string | null;
  materials: { id: string; name: string; quantity: number }[];
  /** Procedimentos cadastrados agora, a partir da guia (precisam entrar nas opções do formulário). */
  createdProcedures: { id: string; name: string; tuss_code: string | null }[];
  /** Paciente cadastrado agora (cadastro inicial) — precisa entrar nas opções do formulário. */
  createdPatient: { id: string; full_name: string } | null;
};

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

// Rascunho editável da FASE 1 (validação do que a IA leu)
type Draft = {
  patientName: string;
  indication: string;
  procedures: { id: string; code: string; description: string }[];
  materials: { id: string; name: string; quantity: string; details: string }[];
  notes: string[];
};

let uid = 0;
const nextId = () => `r${++uid}`;

function toDraft(e: RequestExtraction): Draft {
  return {
    patientName: e.patient_name ?? "",
    indication: e.clinical_indication ?? "",
    procedures: e.procedures.map((p) => ({ id: nextId(), code: p.tuss_code ?? "", description: p.description })),
    materials: e.materials.map((m) => ({
      id: nextId(),
      name: m.name,
      quantity: m.quantity ? String(m.quantity) : "1",
      details: m.details ?? "",
    })),
    notes: e.legibility_notes,
  };
}

function fromDraft(d: Draft, guideType: RequestExtraction["guide_type"]): RequestExtraction {
  return {
    guide_type: guideType,
    patient_name: d.patientName.trim() || null,
    clinical_indication: d.indication.trim() || null,
    procedures: d.procedures
      .map((p) => ({ tuss_code: p.code.replace(/\D/g, "") || null, description: p.description.trim() }))
      .filter((p) => p.tuss_code || p.description),
    materials: d.materials
      .map((m) => ({
        name: m.name.trim(),
        quantity: Number(m.quantity.replace(",", ".")) > 0 ? Number(m.quantity.replace(",", ".")) : null,
        details: m.details.trim() || null,
      }))
      .filter((m) => m.name),
    legibility_notes: [],
  };
}

const inputCls = "h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm";

type Step = "upload" | "validate" | "match";

export function RequestReader({ onApply }: { onApply: (result: ReaderApplyResult) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [guideType, setGuideType] = useState<RequestExtraction["guide_type"]>("outro");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [analysis, setAnalysis] = useState<RequestAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escolhas do usuário na FASE 2
  const [patientId, setPatientId] = useState("");
  const [procChecked, setProcChecked] = useState<Record<string, boolean>>({});
  const [matChecked, setMatChecked] = useState<Record<string, boolean>>({});
  const [matChoice, setMatChoice] = useState<Record<string, string>>({});
  const [useIndication, setUseIndication] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [createdProcedures, setCreatedProcedures] = useState<ReaderApplyResult["createdProcedures"]>([]);
  const [createdPatient, setCreatedPatient] = useState<ReaderApplyResult["createdPatient"]>(null);
  // Busca livre no catálogo de materiais (quando a sugestão não é o material certo).
  const [catalog, setCatalog] = useState<{
    key: string;
    query: string;
    loading: boolean;
    results: { id: string; name: string }[] | null;
  } | null>(null);
  // Busca do código TUSS 19 (materiais) para o item que o usuário vai cadastrar.
  const [picker, setPicker] = useState<{
    key: string;
    query: string;
    loading: boolean;
    results: TussResult[] | null;
    error: string | null;
  } | null>(null);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStep("upload");
    setDraft(null);
    setConfirmed(false);
    setAnalysis(null);
    setError(null);
    setPicker(null);
    setCreatedProcedures([]);
    setCreatedPatient(null);
  }

  // FASE 1: a IA lê a foto; o usuário valida/corrige
  function handleFile(file: File | undefined) {
    if (!file) return;
    reset();
    startTransition(async () => {
      try {
        const small = await shrinkImage(file);
        setPreview(URL.createObjectURL(small));
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

  // FASE 2: com os dados validados, busca/cadastra no sistema
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
      setAnalysis(a);
      setPatientId(a.patient.patient?.id ?? "");
      setProcChecked(Object.fromEntries(a.procedures.map((p) => [p.key, p.match !== "none"])));
      setMatChecked(Object.fromEntries(a.materials.map((m) => [m.key, m.source === "guide" && !!m.material])));
      setMatChoice(Object.fromEntries(a.materials.map((m) => [m.key, m.material?.id ?? ""])));
      setUseIndication(Boolean(a.clinical_indication));
      setPicker(null);
      setStep("match");
    });
  }

  async function createPatient() {
    const name = analysis?.patient.read_name;
    if (!name || creating) return;
    setCreating("patient");
    const res = await createPatientFromRequestAction({ full_name: name });
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
    toast.success(
      patient.existing
        ? `Já existia um paciente com esse nome: ${patient.full_name}.`
        : `Paciente cadastrado: ${patient.full_name}. Complete os dados depois na ficha.`
    );
  }

  async function createProcedure(key: string) {
    const p = analysis?.procedures.find((x) => x.key === key);
    if (!p || creating) return;
    setCreating(key);
    const res = await createProcedureFromRequestAction({ code: p.read_code, description: p.read_description });
    setCreating(null);
    if (res.error || !res.item) {
      toast.error(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    const item = res.item;
    setCreatedProcedures((prev) => (prev.some((x) => x.id === item.id) ? prev : [...prev, item]));
    setAnalysis((a) =>
      a
        ? {
            ...a,
            procedures: a.procedures.map((x) =>
              x.key === key ? { ...x, match: "exact", procedure: { id: item.id, name: item.name, tuss_code: item.tuss_code } } : x
            ),
          }
        : a
    );
    setProcChecked((s) => ({ ...s, [key]: true }));
    toast.success(`Procedimento cadastrado: ${item.name}`);
  }

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

  async function runPickerSearch(key: string, query: string) {
    setPicker({ key, query, loading: true, results: null, error: null });
    const res = await searchTussMaterialsAction(query);
    setPicker((cur) =>
      cur && cur.key === key
        ? { ...cur, loading: false, results: res.results ?? [], error: res.error ?? null }
        : cur
    );
  }

  function openPicker(key: string) {
    const m = analysis?.materials.find((x) => x.key === key);
    if (!m) return;
    // Só o nome: marca/medida escritas ("Microtech 16 mm") restringem demais; o usuário pode refinar.
    setCatalog(null);
    void runPickerSearch(key, m.read_name);
  }

  async function createMaterial(key: string, tuss: TussResult | null) {
    const m = analysis?.materials.find((x) => x.key === key);
    if (!m || creating) return;
    setCreating(key);
    const res = await createMaterialFromRequestAction({
      name: m.read_name,
      details: m.details,
      tuss: tuss
        ? {
            code: tuss.code,
            manufacturer: tuss.manufacturer,
            model: tuss.model,
            anvisaRegistration: tuss.anvisaRegistration,
          }
        : null,
    });
    setCreating(null);
    if (res.error || !res.item) {
      toast.error(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    const item = res.item;
    setPicker(null);
    setCatalog(null);
    setAnalysis((a) =>
      a ? { ...a, materials: a.materials.map((x) => (x.key === key ? { ...x, material: { id: item.id, name: item.name } } : x)) } : a
    );
    setMatChoice((s) => ({ ...s, [key]: item.id }));
    setMatChecked((s) => ({ ...s, [key]: true }));
    toast.success(`Material cadastrado: ${item.name}${item.tuss_code ? ` (TUSS ${item.tuss_code})` : " (sem código TUSS)"}`);
  }

  async function createAllMissing() {
    if (!analysis) return;
    for (const p of analysis.procedures.filter((x) => !x.procedure)) await createProcedure(p.key);
  }

  function apply() {
    if (!analysis) return;
    const materials = analysis.materials
      .filter((m) => matChecked[m.key] && matChoice[m.key])
      .map((m) => {
        const id = matChoice[m.key];
        const name = m.material?.id === id ? m.material.name : (m.alternatives.find((a) => a.id === id)?.name ?? m.read_name);
        return { id, name, quantity: m.quantity };
      });
    onApply({
      patientId: patientId || null,
      procedureIds: analysis.procedures
        .filter((p) => procChecked[p.key] && p.procedure)
        .map((p) => p.procedure!.id),
      clinicalIndication: useIndication ? analysis.clinical_indication : null,
      materials,
      createdProcedures,
      createdPatient,
    });
    toast.success("Dados do pedido aplicados. Revise o formulário antes de salvar.");
    setOpen(false);
    reset();
  }

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
              A IA lê a guia e sugere paciente, procedimentos e materiais. Você revisa antes de salvar.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" className="h-10 shrink-0" onClick={() => setOpen(true)}>
          <Camera className="mr-2 h-4 w-4" />
          Ler pedido por foto
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (pending) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ler pedido por foto</DialogTitle>
            <DialogDescription>
              Envie uma foto nítida da guia (de frente, bem iluminada). A foto é enviada ao serviço de IA só para a
              leitura e não é guardada.
            </DialogDescription>
          </DialogHeader>

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

          {step === "upload" ? (
            <div className="flex flex-col items-center gap-3 py-6">
              {pending ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" /> Lendo o pedido… pode levar até 30 segundos.
                </p>
              ) : (
                <Button type="button" className="h-11" onClick={() => inputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" />
                  Escolher foto ou tirar agora
                </Button>
              )}
              {error ? (
                <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "validate" && draft ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Foto do pedido" className="max-h-72 w-full rounded-lg border border-border object-contain md:sticky md:top-0 md:max-h-[34rem]" />
              ) : null}

              <div className="flex min-w-0 flex-col gap-5 text-sm">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
                  <p className="font-semibold">Etapa 1 de 2 — Confira o que a IA leu</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Compare com a foto e corrija o que estiver errado. Só depois de confirmar, o sistema busca e cadastra
                    paciente, procedimentos e materiais.
                  </p>
                </div>

                {draft.notes.length > 0 ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <p className="mb-1 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> A IA ficou em dúvida nestes pontos — confira na foto:
                    </p>
                    <ul className="list-inside list-disc">
                      {draft.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <section className="flex flex-col gap-1.5">
                  <label htmlFor="rd-patient" className="font-semibold text-foreground">Nome do paciente</label>
                  <input
                    id="rd-patient"
                    className={inputCls + " h-10"}
                    value={draft.patientName}
                    onChange={(e) => setDraft((d) => (d ? { ...d, patientName: e.target.value } : d))}
                    placeholder="Nome completo, como está na guia"
                  />
                </section>

                <section className="flex flex-col gap-1.5">
                  <label htmlFor="rd-indication" className="font-semibold text-foreground">Indicação clínica</label>
                  <textarea
                    id="rd-indication"
                    className="min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={draft.indication}
                    onChange={(e) => setDraft((d) => (d ? { ...d, indication: e.target.value } : d))}
                  />
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="font-semibold text-foreground">Procedimentos (código TUSS + descrição)</h3>
                  {draft.procedures.map((p) => {
                    const digits = p.code.replace(/\D/g, "");
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <div className="flex gap-2">
                          <input
                            className={inputCls + " w-28 shrink-0 font-mono"}
                            inputMode="numeric"
                            value={p.code}
                            maxLength={10}
                            placeholder="código"
                            aria-label="Código TUSS"
                            onChange={(e) =>
                              setDraft((d) => (d ? { ...d, procedures: d.procedures.map((x) => (x.id === p.id ? { ...x, code: e.target.value } : x)) } : d))
                            }
                          />
                          <input
                            className={inputCls + " flex-1"}
                            value={p.description}
                            placeholder="descrição"
                            aria-label="Descrição do procedimento"
                            onChange={(e) =>
                              setDraft((d) => (d ? { ...d, procedures: d.procedures.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x)) } : d))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label="Remover procedimento"
                            onClick={() => setDraft((d) => (d ? { ...d, procedures: d.procedures.filter((x) => x.id !== p.id) } : d))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {digits && digits.length !== 8 ? (
                          <span className="text-xs text-amber-700 dark:text-amber-400">O código TUSS de procedimento tem 8 dígitos — confira.</span>
                        ) : null}
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit"
                    onClick={() => setDraft((d) => (d ? { ...d, procedures: [...d.procedures, { id: nextId(), code: "", description: "" }] } : d))}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar procedimento
                  </Button>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="font-semibold text-foreground">Materiais citados</h3>
                  {draft.materials.map((m) => (
                    <div key={m.id} className="flex flex-wrap gap-2">
                      <input
                        className={inputCls + " min-w-40 flex-1"}
                        value={m.name}
                        placeholder="material"
                        aria-label="Nome do material"
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, materials: d.materials.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) } : d))
                        }
                      />
                      <input
                        className={inputCls + " w-16 shrink-0"}
                        inputMode="decimal"
                        value={m.quantity}
                        aria-label="Quantidade"
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, materials: d.materials.map((x) => (x.id === m.id ? { ...x, quantity: e.target.value } : x)) } : d))
                        }
                      />
                      <input
                        className={inputCls + " min-w-32 flex-1"}
                        value={m.details}
                        placeholder="marca / medida"
                        aria-label="Marca ou medida"
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, materials: d.materials.map((x) => (x.id === m.id ? { ...x, details: e.target.value } : x)) } : d))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        aria-label="Remover material"
                        onClick={() => setDraft((d) => (d ? { ...d, materials: d.materials.filter((x) => x.id !== m.id) } : d))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit"
                    onClick={() => setDraft((d) => (d ? { ...d, materials: [...d.materials, { id: nextId(), name: "", quantity: "1", details: "" }] } : d))}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar material
                  </Button>
                </section>

                <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                  <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                  <span>Conferi os dados com a foto e estão corretos.</span>
                </label>
                {error ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === "match" && analysis ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Foto do pedido" className="max-h-72 w-full rounded-lg border border-border object-contain md:max-h-[28rem]" />
              ) : null}

              <div className="flex min-w-0 flex-col gap-5 text-sm">
                {analysis.legibility_notes.length > 0 ? (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <p className="mb-1 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Trechos incertos na leitura — confira:
                    </p>
                    <ul className="list-inside list-disc">
                      {analysis.legibility_notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Paciente */}
                <section>
                  <h3 className="mb-1.5 font-semibold text-foreground">Paciente</h3>
                  <p className="text-xs text-muted-foreground">
                    Lido na guia: <span className="text-foreground">{analysis.patient.read_name ?? "não identificado"}</span>
                  </p>
                  {analysis.patient.patient || analysis.patient.alternatives.length > 0 ? (
                    <select
                      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      aria-label="Paciente cadastrado correspondente"
                    >
                      <option value="">Não usar / escolher depois</option>
                      {[analysis.patient.patient, ...analysis.patient.alternatives]
                        .filter((p): p is { id: string; full_name: string } => Boolean(p))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                            {analysis.patient.match === "exact" && p.id === analysis.patient.patient?.id ? " ✓" : ""}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                      Paciente não encontrado no cadastro.
                    </p>
                  )}
                  {!analysis.patient.patient && analysis.patient.read_name ? (
                    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="text-xs text-muted-foreground">
                        Cadastro inicial: grava só o nome <span className="font-medium text-foreground">{analysis.patient.read_name}</span>.
                        Depois você completa CPF, nascimento, contato e convênio na ficha do paciente.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8"
                        disabled={creating !== null}
                        onClick={createPatient}
                      >
                        {creating === "patient" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <UserPlus className="mr-1.5 h-3.5 w-3.5" />}
                        Cadastrar paciente (cadastro inicial)
                      </Button>
                    </div>
                  ) : null}
                </section>

                {/* Indicação */}
                {analysis.clinical_indication ? (
                  <section>
                    <h3 className="mb-1.5 font-semibold text-foreground">Indicação clínica</h3>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1" checked={useIndication} onChange={(e) => setUseIndication(e.target.checked)} />
                      <span>{analysis.clinical_indication} <span className="text-xs text-muted-foreground">(vai para as observações)</span></span>
                    </label>
                  </section>
                ) : null}

                {/* Procedimentos */}
                <section>
                  <h3 className="mb-1.5 font-semibold text-foreground">Procedimentos</h3>
                  <ul className="flex flex-col gap-2">
                    {analysis.procedures.map((p) => (
                      <li key={p.key} className="rounded-lg border border-border p-2.5">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={!p.procedure}
                            checked={Boolean(procChecked[p.key])}
                            onChange={(e) => setProcChecked((s) => ({ ...s, [p.key]: e.target.checked }))}
                          />
                          <span className="min-w-0">
                            <span className="block text-foreground">
                              {p.procedure ? p.procedure.name : "Sem correspondência no seu cadastro"}
                              {p.match === "exact" ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-500" /> : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Lido: {p.read_code ?? "sem código"} · {p.read_description || "—"}
                              {p.match === "similar" ? " · correspondência pelo nome, confira" : ""}
                            </span>
                            {p.tuss_official_name ? (
                              <span className="block text-xs text-muted-foreground">TUSS {p.read_code}: {p.tuss_official_name}</span>
                            ) : null}
                            {p.tuss_code_unknown ? (
                              <span className="block text-xs text-amber-700 dark:text-amber-400">
                                Código lido não existe na TUSS — possível erro de leitura.
                              </span>
                            ) : null}
                            {!p.procedure ? (
                              <span className="block text-xs text-amber-700 dark:text-amber-400">
                                Ainda não está no seu catálogo de procedimentos.
                              </span>
                            ) : null}
                          </span>
                        </label>
                        {!p.procedure ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-6 mt-2 h-8"
                            disabled={creating !== null}
                            onClick={() => createProcedure(p.key)}
                          >
                            {creating === p.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                            Cadastrar no catálogo{p.tuss_official_name ? " (nome oficial TUSS)" : ""}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                    {analysis.procedures.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum procedimento lido.</li> : null}
                  </ul>
                </section>

                {/* Materiais */}
                <section>
                  <h3 className="mb-1.5 font-semibold text-foreground">Materiais sugeridos</h3>
                  <ul className="flex flex-col gap-2">
                    {analysis.materials.map((m) => (
                      <li key={m.key} className="rounded-lg border border-border p-2.5">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={!matChoice[m.key]}
                            checked={Boolean(matChecked[m.key])}
                            onChange={(e) => setMatChecked((s) => ({ ...s, [m.key]: e.target.checked }))}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-foreground">
                              {m.source === "guide" ? m.read_name : m.material?.name} × {m.quantity}
                              {m.details ? <span className="text-muted-foreground"> · {m.details}</span> : null}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {m.source === "kit" ? "Do kit padrão dos procedimentos" : "Citado na guia"}
                            </span>
                            {m.source === "guide" && !m.material ? (
                              <span className="block text-xs text-amber-700 dark:text-amber-400">
                                {m.alternatives.length > 0
                                  ? "Sem correspondência exata — escolha um parecido ou deixe de fora:"
                                  : "Ainda não está no seu catálogo de materiais."}
                              </span>
                            ) : null}
                          </span>
                        </label>
                        {m.source === "guide" && (!m.material || picker?.key === m.key) ? (
                          picker?.key === m.key ? (
                            <div className="ml-6 mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                              <p className="text-xs font-medium text-foreground">Escolha o código TUSS 19 do material</p>
                              <div className="flex gap-2">
                                <input
                                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                  value={picker.query}
                                  onChange={(e) => setPicker((c) => (c ? { ...c, query: e.target.value } : c))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void runPickerSearch(m.key, picker.query);
                                    }
                                  }}
                                  aria-label="Buscar na TUSS 19"
                                />
                                <Button type="button" variant="outline" size="sm" className="h-9" disabled={picker.loading} onClick={() => runPickerSearch(m.key, picker.query)}>
                                  Buscar
                                </Button>
                              </div>
                              {picker.loading ? (
                                <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando a tabela TUSS na ANS (pode levar alguns segundos)…
                                </p>
                              ) : null}
                              {picker.error ? <p className="text-xs text-red-600 dark:text-red-400">{picker.error}</p> : null}
                              {picker.results && picker.results.length === 0 && !picker.error ? (
                                <p className="text-xs text-muted-foreground">Nada encontrado. Tente menos palavras (ex.: só “papilótomo”).</p>
                              ) : null}
                              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                                {(picker.results ?? []).map((r) => (
                                  <li key={r.code}>
                                    <button
                                      type="button"
                                      disabled={creating !== null}
                                      onClick={() => createMaterial(m.key, r)}
                                      className="w-full rounded-md border border-border p-2 text-left text-xs hover:bg-muted disabled:opacity-60"
                                    >
                                      <span className="block font-medium text-foreground">{r.code} · {r.name}</span>
                                      <span className="block text-muted-foreground">
                                        {[r.manufacturer, r.model ? `Modelo ${r.model}` : null, r.anvisaRegistration ? `ANVISA ${r.anvisaRegistration}` : null, r.active ? null : "não vigente"]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="h-8" disabled={creating !== null} onClick={() => createMaterial(m.key, null)}>
                                  {creating === m.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                                  Cadastrar sem código TUSS
                                </Button>
                                <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setPicker(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-6 mt-2 h-8"
                              disabled={creating !== null}
                              onClick={() => openPicker(m.key)}
                            >
                              Cadastrar no catálogo (buscar código TUSS)
                            </Button>
                          )
                        ) : null}
                        {m.source === "guide" && (m.alternatives.length > 0 || m.material) ? (
                          <select
                            className="ml-6 mt-1.5 h-9 w-[calc(100%-1.5rem)] rounded-md border border-input bg-background px-2 text-xs"
                            value={matChoice[m.key] ?? ""}
                            onChange={(e) => {
                              setMatChoice((s) => ({ ...s, [m.key]: e.target.value }));
                              setMatChecked((s) => ({ ...s, [m.key]: Boolean(e.target.value) }));
                            }}
                            aria-label={`Material do catálogo para ${m.read_name}`}
                          >
                            <option value="">Nenhum</option>
                            {[m.material, ...m.alternatives]
                              .filter((x): x is { id: string; name: string } => Boolean(x))
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                        ) : null}
                        {m.source === "guide" && picker?.key !== m.key ? (
                          <div className="ml-6 mt-1.5 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              disabled={creating !== null}
                              onClick={() => {
                                setPicker(null);
                                void runCatalogSearch(m.key, m.read_name);
                              }}
                            >
                              Não é este? Buscar outro no catálogo
                            </Button>
                            {m.material ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                disabled={creating !== null}
                                onClick={() => openPicker(m.key)}
                              >
                                Cadastrar como novo (buscar código TUSS)
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                        {catalog?.key === m.key ? (
                          <div className="ml-6 mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                            <div className="flex gap-2">
                              <input
                                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                                value={catalog.query}
                                placeholder="Nome, código interno ou TUSS"
                                aria-label="Buscar no catálogo de materiais"
                                onChange={(e) => setCatalog((c) => (c ? { ...c, query: e.target.value } : c))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void runCatalogSearch(m.key, catalog.query);
                                  }
                                }}
                              />
                              <Button type="button" variant="outline" size="sm" className="h-9" disabled={catalog.loading} onClick={() => runCatalogSearch(m.key, catalog.query)}>
                                Buscar
                              </Button>
                            </div>
                            {catalog.loading ? (
                              <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
                              </p>
                            ) : null}
                            {catalog.results && catalog.results.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nada encontrado no catálogo com esse termo.</p>
                            ) : null}
                            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                              {(catalog.results ?? []).map((r) => (
                                <li key={r.id}>
                                  <button
                                    type="button"
                                    onClick={() => chooseCatalogMaterial(m.key, r)}
                                    className="w-full rounded-md border border-border p-2 text-left text-xs text-foreground hover:bg-muted"
                                  >
                                    {r.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-2">
                              <Button type="button" variant="outline" size="sm" className="h-8" disabled={creating !== null} onClick={() => openPicker(m.key)}>
                                Não está no catálogo: cadastrar (buscar código TUSS)
                              </Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setCatalog(null)}>
                                Fechar
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    ))}
                    {analysis.materials.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum material sugerido.</li> : null}
                  </ul>
                </section>
              </div>
            </div>
          ) : null}

          {step === "validate" ? (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="h-10" disabled={pending} onClick={() => { reset(); inputRef.current?.click(); }}>
                Usar outra foto
              </Button>
              <Button type="button" className="h-10" disabled={pending || !confirmed} onClick={advance}>
                {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar e avançar
              </Button>
            </DialogFooter>
          ) : null}

          {step === "match" && analysis ? (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="h-10" disabled={creating !== null} onClick={() => setStep("validate")}>
                Voltar e corrigir
              </Button>
              {analysis.procedures.some((p) => !p.procedure) ? (
                <Button type="button" variant="outline" className="h-10" disabled={creating !== null} onClick={createAllMissing}>
                  Cadastrar procedimentos que faltam
                </Button>
              ) : null}
              <Button type="button" className="h-10" disabled={creating !== null} onClick={apply}>
                Aplicar ao formulário
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
