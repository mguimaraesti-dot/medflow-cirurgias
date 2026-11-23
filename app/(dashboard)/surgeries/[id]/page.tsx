import Link from "next/link";
import { ArrowLeft, Building2, ClipboardList, FileText, Pencil, Stethoscope, User } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listActiveMaterialsForSelect } from "@/lib/data/materials";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { parseSurgeryNotes } from "@/lib/surgery-notes";
import {
  getSurgery,
  listRequirements,
  listWorkflowStages,
  getSurgeryHistoryTimeline,
} from "@/lib/data/surgeries";
import {
  getAuthorizationRequest,
  listSurgeryMaterialItems,
  getOrReservation,
  getOrCreateChecklist,
  listPreoperativeItems,
} from "@/lib/data/operations";
import { formatCompositionCode } from "@/lib/compositions/signature";
import { getSurgeryCompositionBrief } from "@/lib/data/compositions";
import { listSurgeryDocuments } from "@/lib/data/surgery-documents";
import { getOrCreateFinancialRecord, listInstallments } from "@/lib/data/financial";
import { computeSurgeryProgressSteps } from "@/lib/surgery-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurgeryProgressBar } from "@/components/surgeries/surgery-progress-bar";
import { SurgeryRequirementsPanel } from "@/components/surgeries/surgery-requirements-panel";
import { FinancialPanel } from "@/components/surgeries/financial-panel";
import { MaterialsSection } from "@/components/surgeries/materials-section";
import { HistoryPanel } from "@/components/surgeries/history-panel";
import { CopySurgeryWhatsappButton } from "@/components/surgeries/copy-surgery-whatsapp-button";
import { CopyAuthorizationRequestButton } from "@/components/surgeries/copy-authorization-request-button";
import { CancelSurgeryButton } from "@/components/surgeries/cancel-surgery-button";

// O upload de documentos (Solicitação hospitalar) pode levar mais que o
// padrão de 10s das Server Actions na Vercel — damos mais margem aqui.
export const maxDuration = 30;

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

export default async function SurgeryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ open?: string }>;
}) {
  await requireModuleView("surgeries");
  const { id } = await params;
  // ?open=authorization | or_reservation: a lista de cirurgias leva direto
  // pro card de requisito já aberto.
  const { open: openParam } = await searchParams;
  const defaultOpenKey =
    openParam === "authorization" || openParam === "or_reservation" ? openParam : null;
  const supabase = await createClient();
  const [surgery, requirements, stages, history] = await Promise.all([
    getSurgery(supabase, id),
    listRequirements(supabase, id),
    listWorkflowStages(supabase),
    getSurgeryHistoryTimeline(supabase, id),
  ]);

  const [authorization, orReservation, checklistId] = await Promise.all([
    getAuthorizationRequest(supabase, id),
    getOrReservation(supabase, id),
    getOrCreateChecklist(supabase, id),
  ]);

  const user = await getCurrentUser();
  const [compositionBrief, materialItems, materialOptions, supplierOptions, canEdit] = await Promise.all([
    getSurgeryCompositionBrief(supabase, id),
    listSurgeryMaterialItems(supabase, id),
    listActiveMaterialsForSelect(supabase),
    listActiveSuppliersForSelect(supabase),
    user ? hasPermission(user, "surgeries", "edit") : Promise.resolve(false),
  ]);

  const [preoperativeItems, documents, financialRecord] = await Promise.all([
    listPreoperativeItems(supabase, checklistId),
    listSurgeryDocuments(supabase, id),
    getOrCreateFinancialRecord(supabase, id, surgery.attendance_type),
  ]);

  // Convênio (faturamento/glosas) está fora de escopo por ora — só
  // particular busca parcelas de verdade.
  const installments =
    surgery.attendance_type === "particular" ? await listInstallments(supabase, financialRecord.id) : [];

  const progressSteps = computeSurgeryProgressSteps(stages, surgery);

  const notes = parseSurgeryNotes(surgery.admin_notes);
  const currentStage = stages.find((st) => st.id === surgery.stage_id);

  // Pendências para liberação: documentação + requisitos ainda não atendidos.
  const pendingCount =
    (documents.length === 0 ? 1 : 0) +
    requirements.filter(
      (r) => ["authorization", "or_reservation", "preoperative"].includes(r.requirement_key) && !r.waived && !r.is_satisfied
    ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/kanban"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mapa Cirúrgico
      </Link>

      {/* Cabeçalho + andamento */}
      <header className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{surgery.code}</h1>
              <Badge variant={surgery.status === "cancelled" ? "destructive" : "secondary"}>
                {STATUS_LABEL[surgery.status] ?? surgery.status}
              </Badge>
              <Badge variant="outline">{PRIORITY_LABEL[surgery.priority]}</Badge>
              {currentStage ? (
                <span className="text-xs text-muted-foreground">
                  Etapa atual: <strong className="font-medium text-foreground">{currentStage.name}</strong>
                </span>
              ) : null}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-lg font-medium text-foreground">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              {surgery.patient ? (
                <Link href={`/surgeries/patients/${surgery.patient.id}`} className="hover:underline">
                  {surgery.patient.full_name}
                </Link>
              ) : (
                "—"
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <span>
                Atendimento {surgery.attendance_type === "particular" ? "particular" : "convênio"}
                {surgery.insurance_provider ? ` — ${surgery.insurance_provider.name}` : ""}
              </span>
              <span>Solicitação {formatDate(surgery.indication_date)}</span>
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {surgery.hospital?.name ?? "—"}
              </span>
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>Prevista: {formatDate(surgery.expected_date)}</span>
              <span>
                Confirmada: {formatDate(surgery.confirmed_date)}
                {surgery.confirmed_time ? ` às ${surgery.confirmed_time.slice(0, 5)}` : ""}
              </span>
              {compositionBrief ? (
                <span>
                  Composição{" "}
                  <Link
                    href={`/catalog/compositions#comp-${compositionBrief.number}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {formatCompositionCode(compositionBrief.number)}
                  </Link>{" "}
                  · {compositionBrief.uses} guia(s)
                </span>
              ) : null}
            </p>
            {surgery.status === "cancelled" && surgery.cancelled_reason ? (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                Motivo do cancelamento: {surgery.cancelled_reason}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyAuthorizationRequestButton surgeryId={surgery.id} />
            <CopySurgeryWhatsappButton surgeryId={surgery.id} />
            {surgery.status === "active" ? <CancelSurgeryButton surgeryId={surgery.id} /> : null}
            <Link href={`/surgeries/${surgery.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </Link>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <SurgeryProgressBar steps={progressSteps} />
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {/* Coluna clínica */}
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                <Stethoscope className="h-4 w-4" />
              </span>
              Indicação cirúrgica
            </h2>

            <div className="mt-3 border-l-2 border-primary pl-3">
              <p className="text-xs text-muted-foreground">Indicação clínica</p>
              <p className="text-sm font-medium text-foreground">
                {notes.indication ?? <span className="font-normal text-muted-foreground">Não informada.</span>}
              </p>
            </div>

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
              Procedimentos ({surgery.procedures.length})
            </h3>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {surgery.procedures.map((p, index) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    {p.name}
                    {p.is_primary ? (
                      <span className="ml-2 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                        principal
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {p.tuss_code ? `TUSS ${p.tuss_code}` : "s/ TUSS"}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-border pt-3">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Observações da guia
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {notes.guideObservations ?? <span className="text-muted-foreground">Nenhuma observação da guia.</span>}
              </p>
            </div>

            {notes.other ? (
              <div className="mt-3 border-t border-border pt-3">
                <h3 className="text-sm font-medium text-foreground">Observações internas</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{notes.other}</p>
              </div>
            ) : null}
          </section>

          <MaterialsSection
            surgeryId={surgery.id}
            items={materialItems}
            materials={materialOptions}
            suppliers={supplierOptions}
            canEdit={canEdit}
          />
        </div>

        {/* Coluna operacional */}
        <div className="flex flex-col gap-4">
          <section id="requisitos" className="scroll-mt-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </span>
                Acompanhamento da liberação
              </h2>
              <Badge variant={pendingCount > 0 ? "warning" : "success"}>
                {pendingCount > 0 ? `${pendingCount} pendência${pendingCount === 1 ? "" : "s"}` : "Sem pendências"}
              </Badge>
            </div>
            <SurgeryRequirementsPanel
              defaultOpenKey={defaultOpenKey}
              surgeryId={surgery.id}
              procedureLabel={surgery.procedures.map((p) => p.name).join(", ")}
              procedureNames={surgery.procedures.map((p) => p.name)}
              hospitalId={surgery.hospital_id}
              insuranceProviderId={surgery.insurance_provider_id}
              requirements={requirements}
              authorization={authorization}
              orReservation={orReservation}
              preoperativeItems={preoperativeItems}
              documents={documents}
            />
          </section>

          <FinancialPanel
            surgeryId={surgery.id}
            attendanceType={surgery.attendance_type}
            financialRecord={financialRecord}
            installments={installments}
          />
        </div>
      </div>

      <div className="mt-4">
        <HistoryPanel history={history} />
      </div>
    </div>
  );
}
