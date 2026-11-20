import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getSurgery,
  listRequirements,
  listWorkflowStages,
  getSurgeryHistoryTimeline,
  getFinancialRecord,
} from "@/lib/data/surgeries";
import {
  getAuthorizationRequest,
  getOrReservation,
  getOrCreateChecklist,
  listPreoperativeItems,
  listSurgeryMaterialItems,
} from "@/lib/data/operations";
import { listActiveMaterialsForSelect } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { listApprovedProtocolVersionsForSurgery } from "@/lib/data/protocols";
import { computeSurgeryProgressSteps } from "@/lib/surgery-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SurgeryProgressBar } from "@/components/surgeries/surgery-progress-bar";
import { SurgeryRequirementsPanel } from "@/components/surgeries/surgery-requirements-panel";
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
  const [surgery, requirements, stages, history, financialRecord] = await Promise.all([
    getSurgery(supabase, id),
    listRequirements(supabase, id),
    listWorkflowStages(supabase),
    getSurgeryHistoryTimeline(supabase, id),
    getFinancialRecord(supabase, id),
  ]);

  const [
    authorization,
    orReservation,
    checklistId,
    materials,
    suppliers,
    importableVersions,
  ] = await Promise.all([
    getAuthorizationRequest(supabase, id),
    getOrReservation(supabase, id),
    getOrCreateChecklist(supabase, id),
    listActiveMaterialsForSelect(supabase),
    listActiveSuppliersForSelect(supabase),
    listApprovedProtocolVersionsForSurgery(supabase, surgery.primary_procedure_id, surgery.hospital_id),
  ]);

  const [preoperativeItems, materialItems] = await Promise.all([
    listPreoperativeItems(supabase, checklistId),
    listSurgeryMaterialItems(supabase, id),
  ]);

  const progressSteps = computeSurgeryProgressSteps(stages, surgery);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/kanban"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mapa Cirúrgico
      </Link>

      {/* Cabeçalho compacto */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-medium text-foreground">{surgery.code}</h1>
            <Badge variant={surgery.status === "cancelled" ? "destructive" : "secondary"}>
              {STATUS_LABEL[surgery.status] ?? surgery.status}
            </Badge>
            <Badge variant="outline">{PRIORITY_LABEL[surgery.priority]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
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

      {/* Indicador visual de andamento */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <SurgeryProgressBar steps={progressSteps} />
      </div>

      {/* Resumo da cirurgia */}
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Dados da cirurgia</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Atendimento</dt>
              <dd className="text-foreground">
                {surgery.attendance_type === "particular" ? "Particular" : "Convênio"}
                {surgery.insurance_provider ? ` — ${surgery.insurance_provider.name}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data da indicação</dt>
              <dd className="text-foreground">{formatDate(surgery.indication_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data prevista</dt>
              <dd className="text-foreground">{formatDate(surgery.expected_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Data confirmada</dt>
              <dd className="text-foreground">
                {formatDate(surgery.confirmed_date)}
                {surgery.confirmed_time ? ` às ${surgery.confirmed_time.slice(0, 5)}` : ""}
              </dd>
            </div>
            {surgery.admin_notes ? (
              <div className="col-span-2 md:col-span-4">
                <dt className="text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-wrap text-foreground">{surgery.admin_notes}</dd>
              </div>
            ) : null}
            {surgery.status === "cancelled" && surgery.cancelled_reason ? (
              <div className="col-span-2 md:col-span-4">
                <dt className="text-muted-foreground">Motivo do cancelamento</dt>
                <dd className="text-foreground">{surgery.cancelled_reason}</dd>
              </div>
            ) : null}
          </dl>
          {surgery.status === "active" ? (
            <div className="mt-3 border-t border-border pt-3">
              <CancelSurgeryButton surgeryId={surgery.id} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Cards de requisitos para liberação — expansíveis, um por vez */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-foreground">Requisitos para liberação</h2>
        <SurgeryRequirementsPanel
          surgeryId={surgery.id}
          hospitalId={surgery.hospital_id}
          insuranceProviderId={surgery.insurance_provider_id}
          requirements={requirements}
          authorization={authorization}
          orReservation={orReservation}
          preoperativeItems={preoperativeItems}
          materialItems={materialItems}
          materials={materials}
          suppliers={suppliers}
          importableVersions={importableVersions}
        />
      </div>

      {surgery.attendance_type === "particular" ? (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Valores (particular)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <FinancialForm surgeryId={surgery.id} record={financialRecord} />
          </CardContent>
        </Card>
      ) : null}

      {/* Histórico compacto */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Histórico da cirurgia</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2.5 border-l border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-foreground">{entry.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.changedAt)}
                    </span>
                  </div>
                  {entry.changedByName ? (
                    <p className="text-xs text-muted-foreground">Por {entry.changedByName}</p>
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
