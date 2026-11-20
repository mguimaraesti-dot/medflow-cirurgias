import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getSurgery,
  listRequirements,
  listStageHistory,
  getFinancialRecord,
} from "@/lib/data/surgeries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { FinancialForm } from "@/components/surgeries/financial-form";
import { CancelSurgeryButton } from "@/components/surgeries/cancel-surgery-button";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export default async function SurgeryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [surgery, requirements, history, financialRecord] = await Promise.all([
    getSurgery(supabase, id),
    listRequirements(supabase, id),
    listStageHistory(supabase, id),
    getFinancialRecord(supabase, id),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/kanban"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Kanban
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium text-slate-900">{surgery.code}</h1>
            <Badge variant={surgery.status === "cancelled" ? "destructive" : "secondary"}>
              {STATUS_LABEL[surgery.status] ?? surgery.status}
            </Badge>
            <Badge variant="outline">{PRIORITY_LABEL[surgery.priority]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {surgery.patient?.full_name} · {surgery.hospital?.name} ·{" "}
            {surgery.primary_procedure?.name}
          </p>
        </div>
        <Link href={`/surgeries/${surgery.id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados da cirurgia</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Atendimento</dt>
              <dd className="text-slate-900">
                {surgery.attendance_type === "particular" ? "Particular" : "Convênio"}
                {surgery.insurance_provider ? ` — ${surgery.insurance_provider.name}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Data da indicação</dt>
              <dd className="text-slate-900">{formatDate(surgery.indication_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Data prevista</dt>
              <dd className="text-slate-900">{formatDate(surgery.expected_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Data confirmada</dt>
              <dd className="text-slate-900">
                {formatDate(surgery.confirmed_date)}
                {surgery.confirmed_time ? ` às ${surgery.confirmed_time.slice(0, 5)}` : ""}
              </dd>
            </div>
            {surgery.admin_notes ? (
              <div className="col-span-2">
                <dt className="text-slate-500">Observações</dt>
                <dd className="whitespace-pre-wrap text-slate-900">{surgery.admin_notes}</dd>
              </div>
            ) : null}
            {surgery.status === "cancelled" && surgery.cancelled_reason ? (
              <div className="col-span-2">
                <dt className="text-slate-500">Motivo do cancelamento</dt>
                <dd className="text-slate-900">{surgery.cancelled_reason}</dd>
              </div>
            ) : null}
          </dl>
          {surgery.status === "active" ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <CancelSurgeryButton surgeryId={surgery.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Requisitos para liberação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {requirements.map((requirement) => (
              <RequirementItem key={requirement.id} requirement={requirement} />
            ))}
          </div>
        </CardContent>
      </Card>

      {surgery.attendance_type === "particular" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Valores (particular)</CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialForm surgeryId={surgery.id} record={financialRecord} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de etapas</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Sem histórico ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2 border-l border-slate-200 pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="text-slate-900">
                    {entry.from_stage ? `${entry.from_stage.name} → ` : "Criada em "}
                    {entry.to_stage?.name}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    {formatDateTime(entry.changed_at)}
                  </span>
                  {entry.reason ? (
                    <p className="text-xs text-slate-500">Motivo: {entry.reason}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
