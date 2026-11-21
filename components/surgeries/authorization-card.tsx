"use client";

import { useActionState, useState } from "react";

import {
  createAuthorizationAction,
  updateAuthorizationAction,
  type AuthorizationFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { AuthorizationRequest } from "@/lib/data/operations";
import { useActionToast } from "@/lib/hooks/use-action-toast";
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
  insuranceProviderId,
  authorization,
}: {
  surgeryId: string;
  procedureLabel: string;
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

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" value={status} onValueChange={setStatus}>
            <SelectTrigger>
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="protocol_number">Nº do protocolo</Label>
          <Input
            id="protocol_number"
            name="protocol_number"
            defaultValue={authorization?.protocol_number ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requested_procedure">Procedimento solicitado à operadora</Label>
        <Input
          id="requested_procedure"
          name="requested_procedure"
          defaultValue={authorization?.requested_procedure ?? procedureLabel}
        />
        <p className="text-xs text-muted-foreground">
          Preenchido com o(s) procedimento(s) da cirurgia — ajuste aqui só se o nome enviado ao
          convênio precisar ser diferente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sent_at">Enviada em</Label>
          <Input id="sent_at" name="sent_at" type="date" defaultValue={authorization?.sent_at ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="returned_at">Retorno em</Label>
          <Input
            id="returned_at"
            name="returned_at"
            type="date"
            defaultValue={authorization?.returned_at ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="validity_date">Validade</Label>
          <Input
            id="validity_date"
            name="validity_date"
            type="date"
            defaultValue={authorization?.validity_date ?? ""}
          />
        </div>
      </div>

      {isApproved ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="approved_at">Data de aprovação</Label>
          <Input
            id="approved_at"
            name="approved_at"
            type="date"
            defaultValue={authorization?.approved_at ?? ""}
          />
        </div>
      ) : null}

      {isDenied ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="denial_reason">
            Motivo da negativa <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="denial_reason"
            name="denial_reason"
            required
            defaultValue={authorization?.denial_reason ?? ""}
          />
        </div>
      ) : null}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : authorization ? "Salvar autorização" : "Registrar solicitação"}
        </Button>
      </div>
    </form>
  );
}
