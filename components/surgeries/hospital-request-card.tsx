"use client";

import { useActionState, useRef } from "react";
import { FileText, Download, Paperclip } from "lucide-react";

import {
  uploadSurgeryDocumentAction,
  removeSurgeryDocumentAction,
  type SurgeryDocumentFormState,
} from "@/app/(dashboard)/surgeries/documents-actions";
import type { SurgeryDocument } from "@/lib/data/surgery-documents";
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

export function HospitalRequestCard({
  surgeryId,
  documents,
  open,
  onToggle,
}: {
  surgeryId: string;
  documents: SurgeryDocument[];
  open: boolean;
  onToggle: () => void;
}) {
  const action = uploadSurgeryDocumentAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useActionToast(state, "Documento anexado.");

  const tone: RequirementTone = documents.length > 0 ? "info" : "neutral";
  const statusLabel =
    documents.length === 0
      ? "Nenhum documento"
      : `${documents.length} documento${documents.length === 1 ? "" : "s"}`;

  return (
    <RequirementCardShell
      icon={Paperclip}
      title="Documentação"
      tone={tone}
      statusLabel={statusLabel}
      summary={
        documents.length > 0
          ? "Documentos do paciente anexados para a solicitação ao hospital."
          : "Anexe os documentos do paciente para enviar ao hospital (pedido médico, RG, carteirinha, laudos...)."
      }
      actionLabel={documents.length > 0 ? "Visualizar / Editar" : "Anexar documentos"}
      open={open}
      onToggle={onToggle}
    >
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
        }}
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Arquivo</Label>
          <Input id="file" name="file" type="file" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Input id="description" name="description" placeholder="Ex: RG, carteirinha, pedido médico..." />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
          {pending ? "Enviando..." : "Anexar"}
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
