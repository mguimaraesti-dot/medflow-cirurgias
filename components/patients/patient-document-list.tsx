"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Eye, FileImage, FileText, Loader2, Trash2 } from "lucide-react";

import { deleteDocumentAction, getDocumentUrlAction } from "@/app/(dashboard)/surgeries/patients/documents-actions";
import type { PatientDocument } from "@/lib/data/patient-documents";
import { CATEGORY_LABEL, formatBytes, formatLabel } from "@/lib/patient-documents";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** Documentos já gravados do paciente: visualizar, baixar e excluir (com confirmação). */
export function PatientDocumentList({
  documents,
  canEdit,
  compact = false,
}: {
  documents: PatientDocument[];
  canEdit: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PatientDocument | null>(null);
  const [deleting, startDelete] = useTransition();

  async function open(doc: PatientDocument, mode: "view" | "download") {
    setBusyId(`${mode}:${doc.id}`);
    // Abre a aba antes do await para o navegador não bloquear o pop-up.
    const tab = mode === "view" ? window.open("", "_blank") : null;
    const result = await getDocumentUrlAction(doc.id, mode);
    setBusyId(null);
    if ("error" in result) {
      tab?.close();
      toast.error(result.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else {
      window.location.assign(result.url); // Content-Disposition: attachment — não sai da página
    }
  }

  function confirmDelete() {
    const doc = toDelete;
    if (!doc) return;
    startDelete(async () => {
      const result = await deleteDocumentAction(doc.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Documento excluído.");
      setToDelete(null);
      router.refresh();
    });
  }

  if (documents.length === 0) return null;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const Icon = doc.mime_type === "application/pdf" ? FileText : FileImage;
          return (
            <li key={doc.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={doc.file_name}>
                    {doc.file_name}
                  </p>
                  <span className="mt-1 inline-flex max-w-full rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <span className="truncate">{CATEGORY_LABEL[doc.category] ?? doc.category}</span>
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(doc.created_at)} · {formatLabel(doc.file_name)} · {formatBytes(doc.size_bytes)}
                    {!compact && doc.uploaded_by_name ? ` · por ${doc.uploaded_by_name}` : ""}
                  </p>
                  {compact && doc.uploaded_by_name ? (
                    <p className="text-xs text-muted-foreground">por {doc.uploaded_by_name}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Visualizar ${doc.file_name}`}
                    title="Visualizar"
                    disabled={busyId !== null}
                    onClick={() => open(doc, "view")}
                  >
                    {busyId === `view:${doc.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label={`Baixar ${doc.file_name}`}
                    title="Baixar"
                    disabled={busyId !== null}
                    onClick={() => open(doc, "download")}
                  >
                    {busyId === `download:${doc.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      aria-label={`Excluir ${doc.file_name}`}
                      title="Excluir"
                      onClick={() => setToDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={toDelete !== null} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir documento?</DialogTitle>
            <DialogDescription>
              {toDelete ? `"${toDelete.file_name}" será removido definitivamente. Essa ação não pode ser desfeita.` : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
