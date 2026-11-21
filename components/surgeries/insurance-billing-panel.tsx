"use client";

import { useActionState, useState } from "react";

import {
  saveInsuranceBillingAction,
  createGlosaAction,
  sendGlosaAppealAction,
  resolveGlosaAction,
  type FinancialActionState,
} from "@/app/(dashboard)/surgeries/financial-actions";
import type { InsuranceBilling, Glosa } from "@/lib/data/financial";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/currency-input";

const initialState: FinancialActionState = {};

const GLOSA_STATUS_LABEL: Record<string, string> = {
  identified: "Identificada",
  in_review: "Em análise",
  appeal_sent: "Recurso enviado",
  awaiting_response: "Aguardando resposta",
  recovered: "Recuperada",
  upheld: "Mantida",
  cancelled: "Cancelada",
};

const GLOSA_STATUS_VARIANT: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  identified: "destructive",
  in_review: "secondary",
  appeal_sent: "secondary",
  awaiting_response: "secondary",
  recovered: "default",
  upheld: "destructive",
  cancelled: "outline",
};

function formatBRL(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function BillingForm({
  surgeryId,
  financialRecordId,
  insuranceProviderId,
  billing,
}: {
  surgeryId: string;
  financialRecordId: string;
  insuranceProviderId: string;
  billing: InsuranceBilling | null;
}) {
  const action = saveInsuranceBillingAction.bind(null, surgeryId, financialRecordId, insuranceProviderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Faturamento salvo.");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tuss_code">Código TUSS</Label>
          <Input id="tuss_code" name="tuss_code" defaultValue={billing?.tuss_code ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="guide_number">Nº da guia</Label>
          <Input id="guide_number" name="guide_number" defaultValue={billing?.guide_number ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="protocol_number">Nº do protocolo</Label>
          <Input id="protocol_number" name="protocol_number" defaultValue={billing?.protocol_number ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billed_at">Data do faturamento</Label>
          <Input id="billed_at" name="billed_at" type="date" defaultValue={billing?.billed_at ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expected_payment_date">Previsão de pagamento</Label>
          <Input
            id="expected_payment_date"
            name="expected_payment_date"
            type="date"
            defaultValue={billing?.expected_payment_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="received_at">Data do recebimento</Label>
          <Input id="received_at" name="received_at" type="date" defaultValue={billing?.received_at ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="received_value">Valor recebido</Label>
          <CurrencyInput id="received_value" name="received_value" defaultValue={billing?.received_value ?? null} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billing_notes">Observações</Label>
        <Textarea id="billing_notes" name="notes" defaultValue={billing?.notes ?? ""} />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar faturamento"}
        </Button>
      </div>
    </form>
  );
}

function NewGlosaForm({
  surgeryId,
  financialRecordId,
  insuranceProviderId,
}: {
  surgeryId: string;
  financialRecordId: string;
  insuranceProviderId: string;
}) {
  const [open, setOpen] = useState(false);
  const action = createGlosaAction.bind(null, surgeryId, financialRecordId, insuranceProviderId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state, "Glosa registrada.");

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Registrar glosa
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="glosa_guide_number">Nº da guia</Label>
        <Input id="glosa_guide_number" name="guide_number" className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="billed_value">Valor faturado</Label>
        <CurrencyInput id="billed_value" name="billed_value" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="glosa_value">Valor da glosa</Label>
        <CurrencyInput id="glosa_value" name="glosa_value" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="glosa_date">Data da glosa</Label>
        <Input
          id="glosa_date"
          name="glosa_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="flex min-w-[180px] flex-col gap-1.5">
        <Label htmlFor="reason">Motivo</Label>
        <Input id="reason" name="reason" />
      </div>
      {state.error ? (
        <p className="w-full text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Registrar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function GlosaRow({ surgeryId, glosa }: { surgeryId: string; glosa: Glosa }) {
  const [action, setAction] = useState<"appeal" | "resolve" | null>(null);
  const appealActionFn = sendGlosaAppealAction.bind(null, surgeryId, glosa.id);
  const [appealState, appealFormAction, appealPending] = useActionState(appealActionFn, initialState);
  useActionToast(appealState, "Recurso registrado.");

  const resolveActionFn = resolveGlosaAction.bind(null, surgeryId, glosa.id);
  const [resolveState, resolveFormAction, resolvePending] = useActionState(resolveActionFn, initialState);
  useActionToast(resolveState, "Glosa atualizada.");

  const canAppeal = glosa.status === "identified" || glosa.status === "in_review";
  const canResolve = !["recovered", "upheld", "cancelled"].includes(glosa.status);

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium text-foreground">{formatBRL(glosa.glosa_value)}</span>
          {glosa.guide_number ? <span className="ml-2 text-muted-foreground">guia {glosa.guide_number}</span> : null}
          <span className="ml-2 text-muted-foreground">{formatDate(glosa.glosa_date)}</span>
          {glosa.reason ? <p className="text-xs text-muted-foreground">{glosa.reason}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={GLOSA_STATUS_VARIANT[glosa.status]}>{GLOSA_STATUS_LABEL[glosa.status]}</Badge>
          {canAppeal ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setAction(action === "appeal" ? null : "appeal")}>
              Recorrer
            </Button>
          ) : null}
          {canResolve ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setAction(action === "resolve" ? null : "resolve")}>
              Concluir
            </Button>
          ) : null}
        </div>
      </div>

      {action === "appeal" ? (
        <form action={appealFormAction} className="flex flex-wrap items-end gap-2 rounded-md bg-muted p-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`appeal_date-${glosa.id}`} className="text-xs">
              Data do recurso
            </Label>
            <Input
              id={`appeal_date-${glosa.id}`}
              name="appeal_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="h-9"
            />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label htmlFor={`justification-${glosa.id}`} className="text-xs">
              Justificativa
            </Label>
            <Input id={`justification-${glosa.id}`} name="justification" className="h-9" />
          </div>
          {appealState.error ? (
            <p className="w-full text-xs text-red-600 dark:text-red-400" role="alert">
              {appealState.error}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={appealPending}>
            {appealPending ? "Salvando..." : "Enviar recurso"}
          </Button>
        </form>
      ) : null}

      {action === "resolve" ? (
        <form action={resolveFormAction} className="flex flex-wrap items-end gap-2 rounded-md bg-muted p-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`status-${glosa.id}`} className="text-xs">
              Resultado
            </Label>
            <select
              id={`status-${glosa.id}`}
              name="status"
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              defaultValue="recovered"
            >
              <option value="recovered">Recuperada</option>
              <option value="upheld">Mantida (perdida)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`recovered_value-${glosa.id}`} className="text-xs">
              Valor recuperado
            </Label>
            <CurrencyInput id={`recovered_value-${glosa.id}`} name="recovered_value" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`recovered_at-${glosa.id}`} className="text-xs">
              Data
            </Label>
            <Input
              id={`recovered_at-${glosa.id}`}
              name="recovered_at"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="h-9"
            />
          </div>
          {resolveState.error ? (
            <p className="w-full text-xs text-red-600 dark:text-red-400" role="alert">
              {resolveState.error}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={resolvePending}>
            {resolvePending ? "Salvando..." : "Confirmar"}
          </Button>
        </form>
      ) : null}
    </li>
  );
}

export function InsuranceBillingPanel({
  surgeryId,
  financialRecordId,
  insuranceProviderId,
  billing,
  glosas,
}: {
  surgeryId: string;
  financialRecordId: string;
  insuranceProviderId: string;
  billing: InsuranceBilling | null;
  glosas: Glosa[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <BillingForm
        surgeryId={surgeryId}
        financialRecordId={financialRecordId}
        insuranceProviderId={insuranceProviderId}
        billing={billing}
      />

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Glosas</p>
          <NewGlosaForm
            surgeryId={surgeryId}
            financialRecordId={financialRecordId}
            insuranceProviderId={insuranceProviderId}
          />
        </div>
        {glosas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma glosa registrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {glosas.map((glosa) => (
              <GlosaRow key={glosa.id} surgeryId={surgeryId} glosa={glosa} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
