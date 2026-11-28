"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Download, Eye, Loader2, Paperclip, UploadCloud, UserRound, X } from "lucide-react";

import {
  uploadSurgeryDocumentAction,
  removeSurgeryDocumentAction,
  type SurgeryDocumentFormState,
} from "@/app/(dashboard)/surgeries/documents-actions";
import { getDocumentUrlAction } from "@/app/(dashboard)/surgeries/patients/documents-actions";
import type { SurgeryDocument } from "@/lib/data/surgery-documents";
import type { PatientDocument } from "@/lib/data/patient-documents";
import { CATEGORY_LABEL } from "@/lib/patient-documents";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteRowButton } from "@/components/shared/delete-row-button";
import { RequirementCardShell, type RequirementTone } from "@/components/surgeries/requirement-card-shell";

const initialState: SurgeryDocumentFormState = {};

function formatDateTime(value: string) {
  // Fixa o fuso de Brasília explicitamente em vez de depender do fuso do
  // navegador/dispositivo, pra ficar sempre consistente com o resto do
  // sistema (ex: o histórico da cirurgia, que roda no servidor).
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** Documento do cadastro do paciente: só abrir/baixar (gerir fica no cadastro do paciente). */
function PatientDocRow({ doc }: { doc: PatientDocument }) {
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  async function open(mode: "view" | "download") {
    setBusy(mode);
    // Abre a aba antes do await para o navegador não bloquear o pop-up.
    const tab = mode === "view" ? window.open("", "_blank") : null;
    const result = await getDocumentUrlAction(doc.id, mode);
    setBusy(null);
    if ("error" in result) {
      tab?.close();
      toast.error(result.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else {
      window.location.assign(result.url);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="flex min-w-0 items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{doc.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {CATEGORY_LABEL[doc.category] ?? "Documento"} · {formatDateTime(doc.created_at)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => open("view")}>
          {busy === "view" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Ver
        </Button>
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => open("download")} aria-label={`Baixar ${doc.file_name}`}>
          {busy === "download" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </li>
  );
}

export function HospitalRequestCard({
  surgeryId,
  documents,
  patientDocuments = [],
  patientId = null,
  open,
  onToggle,
}: {
  surgeryId: string;
  documents: SurgeryDocument[];
  patientDocuments?: PatientDocument[];
  patientId?: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const action = uploadSurgeryDocumentAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  useActionToast(state, "Documento anexado.");

  const total = documents.length + patientDocuments.length;
  const tone: RequirementTone = total > 0 ? "info" : "neutral";
  const statusLabel =
    total === 0 ? "Nenhum documento" : `${total} documento${total === 1 ? "" : "s"}`;

  return (
    <RequirementCardShell
      icon={Paperclip}
      title="Documentação"
      tone={tone}
      statusLabel={statusLabel}
      summary={
        total === 0
          ? "Nenhum documento anexado."
          : patientDocuments.length > 0
            ? `${documents.length} anexado(s) à cirurgia e ${patientDocuments.length} do cadastro do paciente.`
            : "Documentos anexados para a solicitação ao hospital."
      }
      actionLabel={total > 0 ? "Ver documentos" : "Anexar documentos"}
      open={open}
      onToggle={onToggle}
    >
      {patientDocuments.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <UserRound className="h-3.5 w-3.5" /> Do cadastro do paciente
            </p>
            {patientId ? (
              <Link href={`/surgeries/patients/${patientId}`} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                Gerenciar no cadastro
              </Link>
            ) : null}
          </div>
          <ul className="flex flex-col gap-2">
            {patientDocuments.map((doc) => (
              <PatientDocRow key={doc.id} doc={doc} />
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Vinculados automaticamente, sem copiar o arquivo: não precisa anexar de novo. Para incluir ou remover, use o cadastro do paciente.
          </p>
        </section>
      ) : null}

      {patientDocuments.length > 0 ? (
        <p className="border-t border-border pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Anexados a esta cirurgia</p>
      ) : null}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{doc.file_name}</p>
                  {doc.description ? (
                    <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Enviado em {formatDateTime(doc.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {doc.download_url ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                      Abrir
                    </a>
                  </Button>
                ) : null}
                <DeleteRowButton
                  confirmMessage={`Remover o documento "${doc.file_name}"?`}
                  onDelete={() => removeSurgeryDocumentAction(doc.id, surgeryId)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
          setPicked(null);
        }}
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Arquivo</Label>
          <label
            htmlFor="file"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped && fileRef.current) {
                const dt = new DataTransfer();
                dt.items.add(dropped);
                fileRef.current.files = dt.files;
                setPicked({ name: dropped.name, size: dropped.size });
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
              dragging ? "border-primary bg-primary/10" : picked ? "border-emerald-500/60 bg-emerald-500/5" : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
            }`}
          >
            {picked ? (
              <>
                <FileText className="h-6 w-6 text-emerald-500" />
                <span className="max-w-full truncate text-sm font-medium text-foreground">{picked.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(picked.size / 1024 / 1024 >= 1 ? `${(picked.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(picked.size / 1024))} KB`)} · clique para trocar o arquivo
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-primary" />
                <span className="text-sm font-medium text-foreground">Clique para escolher o arquivo</span>
                <span className="text-xs text-muted-foreground">ou arraste e solte aqui · até 15 MB</span>
              </>
            )}
            <input
              ref={fileRef}
              id="file"
              name="file"
              type="file"
              required
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPicked(f ? { name: f.name, size: f.size } : null);
              }}
            />
          </label>
          {picked ? (
            <button
              type="button"
              onClick={() => { if (fileRef.current) fileRef.current.value = ""; setPicked(null); }}
              className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />Remover seleção
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Input id="description" name="description" placeholder="Ex: RG, carteirinha, pedido médico..." />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
          {pending ? "Enviando..." : (<><Paperclip className="h-3.5 w-3.5" />Anexar documento</>)}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </RequirementCardShell>
  );
}
