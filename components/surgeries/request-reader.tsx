"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import {
  analyzeSurgeryRequestAction,
  createMaterialFromRequestAction,
  createProcedureFromRequestAction,
} from "@/app/(dashboard)/surgeries/request-reader-actions";
import type { RequestAnalysis } from "@/lib/surgery-request-types";
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

export function RequestReader({ onApply }: { onApply: (result: ReaderApplyResult) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RequestAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escolhas do usuário na revisão
  const [patientId, setPatientId] = useState("");
  const [procChecked, setProcChecked] = useState<Record<string, boolean>>({});
  const [matChecked, setMatChecked] = useState<Record<string, boolean>>({});
  const [matChoice, setMatChoice] = useState<Record<string, string>>({});
  const [useIndication, setUseIndication] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [createdProcedures, setCreatedProcedures] = useState<ReaderApplyResult["createdProcedures"]>([]);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setCreatedProcedures([]);
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

  async function createMaterial(key: string) {
    const m = analysis?.materials.find((x) => x.key === key);
    if (!m || creating) return;
    setCreating(key);
    const res = await createMaterialFromRequestAction({ name: m.read_name, details: m.details });
    setCreating(null);
    if (res.error || !res.item) {
      toast.error(res.error ?? "Não foi possível cadastrar.");
      return;
    }
    const item = res.item;
    setAnalysis((a) =>
      a ? { ...a, materials: a.materials.map((x) => (x.key === key ? { ...x, material: { id: item.id, name: item.name } } : x)) } : a
    );
    setMatChoice((s) => ({ ...s, [key]: item.id }));
    setMatChecked((s) => ({ ...s, [key]: true }));
    toast.success(`Material cadastrado: ${item.name}`);
  }

  async function createAllMissing() {
    if (!analysis) return;
    for (const p of analysis.procedures.filter((x) => !x.procedure)) await createProcedure(p.key);
    for (const m of analysis.materials.filter((x) => x.source === "guide" && !x.material && x.alternatives.length === 0)) {
      await createMaterial(m.key);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    reset();
    setError(null);
    startTransition(async () => {
      try {
        const small = await shrinkImage(file);
        setPreview(URL.createObjectURL(small));
        const fd = new FormData();
        fd.set("image", small);
        const res = await analyzeSurgeryRequestAction(fd);
        if (res.error || !res.analysis) {
          setError(res.error ?? "Não foi possível ler a imagem.");
          return;
        }
        const a = res.analysis;
        setAnalysis(a);
        setPatientId(a.patient.patient?.id ?? "");
        setProcChecked(Object.fromEntries(a.procedures.map((p) => [p.key, p.match !== "none"])));
        setMatChecked(Object.fromEntries(a.materials.map((m) => [m.key, m.source === "guide" && !!m.material])));
        setMatChoice(Object.fromEntries(a.materials.map((m) => [m.key, m.material?.id ?? ""])));
        setUseIndication(Boolean(a.clinical_indication));
      } catch {
        setError("Não foi possível processar a imagem. Tente outra foto.");
      }
    });
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

          {!analysis ? (
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
          ) : (
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
                      Paciente não encontrado no cadastro. Use o botão “+” ao lado do campo Paciente para cadastrar.
                    </p>
                  )}
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
                        {m.source === "guide" && !m.material ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-6 mt-2 h-8"
                            disabled={creating !== null}
                            onClick={() => createMaterial(m.key)}
                          >
                            {creating === m.key ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                            Cadastrar no catálogo
                          </Button>
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
                      </li>
                    ))}
                    {analysis.materials.length === 0 ? <li className="text-xs text-muted-foreground">Nenhum material sugerido.</li> : null}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {analysis ? (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="h-10" onClick={() => { reset(); inputRef.current?.click(); }}>
                Usar outra foto
              </Button>
              {analysis.procedures.some((p) => !p.procedure) ||
              analysis.materials.some((m) => m.source === "guide" && !m.material && m.alternatives.length === 0) ? (
                <Button type="button" variant="outline" className="h-10" disabled={creating !== null} onClick={createAllMissing}>
                  Cadastrar tudo que falta
                </Button>
              ) : null}
              <Button type="button" className="h-10" onClick={apply}>
                Aplicar ao formulário
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
