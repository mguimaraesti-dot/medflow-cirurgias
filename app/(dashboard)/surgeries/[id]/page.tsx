import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  getSurgery,
  listRequirements,
  listStageHistory,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequirementItem } from "@/components/surgeries/requirement-item";
import { FinancialForm } from "@/components/surgeries/financial-form";
import { CancelSurgeryButton } from "@/components/surgeries/cancel-surgery-button";
import { AuthorizationCard } from "@/components/surgeries/authorization-card";
import { OrReservationCard } from "@/components/surgeries/or-reservation-card";
import { PreoperativeCard } from "@/components/surgeries/preoperative-card";
import { SurgeryMaterialsCard } from "@/components/surgeries/surgery-materials-card";

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

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/kanban"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mapa Cirúrgico
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados da cirurgia</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
              <div className="col-span-2">
                <dt className="text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-wrap text-foreground">{surgery.admin_notes}</dd>
              </div>
            ) : null}
            {surgery.status === "cancelled" && surgery.cancelled_reason ? (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Motivo do cancelamento</dt>
                <dd className="text-foreground">{surgery.cancelled_reason}</dd>
              </div>
            ) : null}
          </dl>
          {surgery.status === "active" ? (
            <div className="mt-4 border-t border-border pt-4">
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Autorização</CardTitle>
        </CardHeader>
        <CardContent>
          <AuthorizationCard
            surgeryId={surgery.id}
            insuranceProviderId={surgery.insurance_provider_id}
            authorization={authorization}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reserva do centro cirúrgico</CardTitle>
        </CardHeader>
        <CardContent>
          <OrReservationCard
            surgeryId={surgery.id}
            hospitalId={surgery.hospital_id}
            reservation={orReservation}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Checklist pré-operatório</CardTitle>
        </CardHeader>
        <CardContent>
          <PreoperativeCard surgeryId={surgery.id} items={preoperativeItems} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Materiais da cirurgia</CardTitle>
        </CardHeader>
        <CardContent>
          <SurgeryMaterialsCard
            surgeryId={surgery.id}
            items={materialItems}
            materials={materials}
            suppliers={suppliers}
            importableVersions={importableVersions}
          />
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
            <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
          ) : (
            <ol className="flex flex-col gap-2 border-l border-border pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="text-foreground">
                    {entry.from_stage ? `${entry.from_stage.name} → ` : "Criada em "}
                    {entry.to_stage?.name}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDateTime(entry.changed_at)}
                  </span>
                  {entry.reason ? (
                    <p className="text-xs text-muted-foreground">Motivo: {entry.reason}</p>
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
