"use client";

import { useActionState, useState } from "react";

import {
  createAuthorizationAction,
  updateAuthorizationAction,
  type AuthorizationFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { AuthorizationRequest } from "@/lib/data/operations";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_requested", label: "Não solicitada" },
  { value: "sent", label: "Enviada" },
  { value: "in_review", label: "Em análise" },
  { value: "pending_docs", label: "Pendente de documentos" },
  { value: "approved", label: "Aprovada" },
  { value: "partially_approved", label: "Parcialmente aprovada" },
  { value: "denied", label: "Negada" },
  { value: "expired", label: "Expirada" },
  { value: "cancelled", label: "Cancelada" },
];

const initialState: AuthorizationFormState = {};

export function AuthorizationCard({
  surgeryId,
  procedureLabel,
  procedureNames,
  insuranceProviderId,
  authorization,
}: {
  surgeryId: string;
  procedureLabel: string;
  procedureNames?: string[];
  insuranceProviderId: string | null;
  authorization: AuthorizationRequest | null;
}) {
  const action = authorization
    ? updateAuthorizationAction.bind(null, authorization.id, surgeryId)
    : createAuthorizationAction.bind(null, surgeryId, insuranceProviderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [status, setStatus] = useState(authorization?.status ?? "not_requested");
  useActionToast(state, "Autorização salva.");

  const isDenied = status === "denied";
  const isApproved = status === "approved" || status === "partially_approved";
  // Enquanto nada foi solicitado, só o status importa: protocolo e datas
  // só aparecem a partir de "Enviada". Os campos escondidos continuam no
  // formulário (só com `hidden`), então nada que já foi salvo se perde ao
  // trocar o status de volta.
  const started = status !== "not_requested";

  const [procedure, setProcedure] = useState(authorization?.requested_procedure ?? procedureLabel);
  const [editingProcedure, setEditingProcedure] = useState(false);

  // Quando o texto enviado é o padrão (procedimentos da cirurgia), mostra a
  // lista numerada em vez de um parágrafo corrido.
  const showList = (procedureNames?.length ?? 0) > 0 && procedure === procedureLabel;

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* 1. Andamento */}
      <section className="flex flex-col gap-3">
        <h4 className={sectionTitle}>Andamento</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={cn("flex flex-col gap-1.5", !started && "sm:col-span-2")}>
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={cn("flex flex-col gap-1.5", !started && "hidden")}>
            <Label htmlFor="protocol_number">Nº do protocolo</Label>
            <Input
              id="protocol_number"
              name="protocol_number"
              className="h-10"
              placeholder="Número informado pelo convênio"
              defaultValue={authorization?.protocol_number ?? ""}
            />
          </div>
        </div>
      </section>

      {/* 2. Datas — só as que fazem sentido para o status atual */}
      <section className={cn("flex flex-col gap-3 border-t border-border pt-4", !started && "hidden")}>
        <h4 className={sectionTitle}>Datas</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sent_at">Enviada em</Label>
            <Input id="sent_at" name="sent_at" type="date" className="h-10" defaultValue={authorization?.sent_at ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="returned_at">Retorno em</Label>
            <Input id="returned_at" name="returned_at" type="date" className="h-10" defaultValue={authorization?.returned_at ?? ""} />
          </div>
          <div className={cn("flex flex-col gap-1.5", !isApproved && "hidden")}>
            <Label htmlFor="approved_at">Aprovada em</Label>
            <Input id="approved_at" name="approved_at" type="date" className="h-10" defaultValue={authorization?.approved_at ?? ""} />
          </div>
          <div className={cn("flex flex-col gap-1.5", !isApproved && "hidden")}>
            <Label htmlFor="validity_date">Validade da autorização</Label>
            <Input id="validity_date" name="validity_date" type="date" className="h-10" defaultValue={authorization?.validity_date ?? ""} />
          </div>
        </div>
      </section>

      {isDenied ? (
        <section className="flex flex-col gap-1.5 border-t border-border pt-4">
          <Label htmlFor="denial_reason">
            Motivo da negativa <span className="text-destructive">*</span>
          </Label>
          <Textarea id="denial_reason" name="denial_reason" required rows={2} defaultValue={authorization?.denial_reason ?? ""} />
        </section>
      ) : null}

      {/* 3. Procedimentos solicitados */}
      <section className="flex flex-col gap-2 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className={sectionTitle}>Procedimentos solicitados</h4>
          {!editingProcedure ? (
            <button
              type="button"
              onClick={() => setEditingProcedure(true)}
              className="text-xs text-primary underline underline-offset-2"
            >
              Alterar texto enviado
            </button>
          ) : null}
        </div>
        {editingProcedure ? (
          <>
            <Textarea
              id="requested_procedure"
              name="requested_procedure"
              rows={3}
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use só se o nome enviado ao convênio precisar ser diferente dos procedimentos da cirurgia.
            </p>
          </>
        ) : (
          <>
            {showList ? (
              <ol className="flex flex-col gap-1">
                {procedureNames!.map((name, i) => (
                  <li key={name + i} className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-sm text-foreground">
                    <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {name}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-sm text-foreground">{procedure}</p>
            )}
            <input type="hidden" name="requested_procedure" value={procedure} readOnly />
          </>
        )}
      </section>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex sm:justify-end">
        <Button type="submit" disabled={pending} className="h-10 w-full px-6 sm:w-auto">
          {pending ? "Salvando..." : authorization ? "Salvar autorização" : "Registrar solicitação"}
        </Button>
      </div>
    </form>
  );
}
