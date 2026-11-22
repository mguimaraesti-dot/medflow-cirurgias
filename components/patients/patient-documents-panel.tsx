"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, CheckCircle2, FileImage, FileText, FolderOpen, Loader2, UploadCloud, X } from "lucide-react";

import type { PatientDocument } from "@/lib/data/patient-documents";
import {
  ACCEPT_ATTRIBUTE,
  DOCUMENT_CATEGORIES,
  MAX_DOCUMENT_BYTES,
  formatBytes,
  formatLabel,
  validateDocumentMeta,
  type DocumentCategory,
} from "@/lib/patient-documents";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientDocumentList } from "@/components/patients/patient-document-list";

export type StagedDocument = {
  key: string;
  file: File;
  category: DocumentCategory;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

/** Sugere a categoria pelo nome do arquivo (o usuário pode trocar). */
function guessCategory(name: string): DocumentCategory {
  const n = name.toLowerCase();
  if (/\b(rg|cnh)\b|identidade|habilita/.test(n)) return "identity";
  if (/\bcpf\b/.test(n)) return "cpf";
  if (/carteir|conv[eê]nio|plano/.test(n)) return "insurance_card";
  if (/pedido|solicita/.test(n)) return "medical_request";
  if (/exame|hemograma|resson|tomograf|ultra/.test(n)) return "exams";
  if (/laudo/.test(n)) return "medical_findings";
  if (/relat[oó]rio/.test(n)) return "medical_reports";
  return "other";
}

export function DocumentsPanel({
  documents,
  staged,
  onStagedChange,
  canEdit,
  unavailableMessage,
  disabled,
}: {
  /** Já gravados (modo edição). */
  documents: PatientDocument[];
  staged: StagedDocument[];
  onStagedChange: (next: StagedDocument[]) => void;
  canEdit: boolean;
  /** Preenchido quando a migração dos documentos ainda não foi aplicada. */
  unavailableMessage?: string | null;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const total = documents.length + staged.length;

  function addFiles(list: FileList | File[]) {
    const accepted: StagedDocument[] = [];
    const errors: string[] = [];
    for (const file of Array.from(list)) {
      const error = validateDocumentMeta({ name: file.name, size: file.size, type: file.type });
      if (error) errors.push(error);
      else
        accepted.push({
          key: crypto.randomUUID(),
          file,
          category: guessCategory(file.name),
          status: "pending",
        });
    }
    setRejected(errors);
    if (accepted.length > 0) onStagedChange([...staged, ...accepted]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled || !canEdit) return;
    addFiles(e.dataTransfer.files);
  }

  const patch = (key: string, p: Partial<StagedDocument>) =>
    onStagedChange(staged.map((d) => (d.key === key ? { ...d, ...p } : d)));

  return (
    <section className="flex h-full flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-label="Documentos">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <FileText className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-foreground">Documentos</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Anexe documentos relevantes do paciente, como RG, carteirinha ou exames.
      </p>

      {unavailableMessage ? (
        <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {unavailableMessage}
        </p>
      ) : canEdit ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
              dragging ? "border-primary bg-primary/10" : "border-primary/40 bg-card"
            )}
          >
            <UploadCloud className="h-9 w-9 text-primary" />
            <p className="text-sm font-semibold text-foreground">Arraste arquivos aqui</p>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              ou clique para selecionar
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              tabIndex={-1}
              aria-label="Selecionar documentos"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Formatos aceitos: PDF, JPG, JPEG e PNG · máximo {MAX_DOCUMENT_BYTES / 1024 / 1024} MB por arquivo
            </p>
          </div>

          {rejected.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs text-destructive" role="alert">
              {rejected.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <h4 className="mt-1 text-sm font-semibold text-foreground">Arquivos anexados ({total})</h4>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-muted-foreground">
          <FolderOpen className="h-10 w-10 text-primary/60" />
          <p className="text-sm">Nenhum documento anexado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {staged.map((doc) => {
            const Icon = doc.file.type === "application/pdf" ? FileText : FileImage;
            const locked = doc.status === "uploading" || doc.status === "done";
            return (
              <div key={doc.key} className="rounded-lg border border-dashed border-primary/50 bg-background p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={doc.file.name}>
                      {doc.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatLabel(doc.file.name)} · {formatBytes(doc.file.size)}
                    </p>
                  </div>
                  <span className="flex h-6 shrink-0 items-center text-xs">
                    {doc.status === "uploading" ? (
                      <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando
                      </span>
                    ) : doc.status === "done" ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enviado
                      </span>
                    ) : doc.status === "error" ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" /> Falhou
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Ao salvar</span>
                    )}
                  </span>
                  {!locked ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onStagedChange(staged.filter((d) => d.key !== doc.key))}
                      aria-label={`Remover ${doc.file.name} da lista`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-2">
                  <Select
                    value={doc.category}
                    disabled={disabled || locked}
                    onValueChange={(v) => patch(doc.key, { category: v as DocumentCategory })}
                  >
                    <SelectTrigger className="h-9 text-xs" aria-label={`Categoria de ${doc.file.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {doc.error ? <p className="mt-2 text-xs text-destructive">{doc.error}</p> : null}
              </div>
            );
          })}
          <PatientDocumentList documents={documents} canEdit={canEdit} compact />
        </div>
      )}
    </section>
  );
}
