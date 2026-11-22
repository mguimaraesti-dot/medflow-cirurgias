import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listPatientDocuments, type PatientDocument } from "@/lib/data/patient-documents";
import { formatAddress } from "@/lib/patient-address";
import { formatCpf, formatPhone } from "@/lib/br-format";
import { getPatient, calculateAge } from "@/lib/data/patients";
import { listSurgeriesByPatient } from "@/lib/data/surgeries";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PatientDocumentList } from "@/components/patients/patient-document-list";
import { PatientSurgeryHistoryTable } from "@/components/patients/patient-surgery-history-table";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleView("patients");
  const { id } = await params;
  const supabase = await createClient();

  const user = await getCurrentUser();
  const [patient, surgeries, insuranceProviders, canEdit, docsResult] = await Promise.all([
    getPatient(supabase, id),
    listSurgeriesByPatient(supabase, id),
    listInsuranceProviders(supabase).then((rows) => rows.filter((r) => r.active)),
    user ? hasPermission(user, "patients", "edit") : Promise.resolve(false),
    // Se a migração 0023 ainda não foi aplicada, a ficha continua abrindo.
    listPatientDocuments(id).then(
      (documents) => ({ documents, unavailable: null as string | null }),
      () => ({
        documents: [] as PatientDocument[],
        unavailable: "Documentos indisponíveis: a migração 0023 ainda não foi aplicada no banco.",
      })
    ),
  ]);
  const { documents, unavailable } = docsResult;

  const age = calculateAge(patient.birth_date);

  return (
    <div>
      <Link
        href="/surgeries/patients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Pacientes
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">{patient.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {age !== null ? `${age} anos` : "Idade não informada"} ·{" "}
            {patient.insurance_provider?.name ?? "Particular"}
          </p>
        </div>
        {canEdit ? (
          <PatientFormDialog
            patient={patient}
            insuranceProviders={insuranceProviders}
            documents={documents}
            documentsUnavailable={unavailable}
          />
        ) : null}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados do paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd className="text-foreground">{patient.cpf ? formatCpf(patient.cpf) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nascimento</dt>
              <dd className="text-foreground">{formatDate(patient.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Celular</dt>
              <dd className="text-foreground">{patient.phone ? formatPhone(patient.phone) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telefone de contato</dt>
              <dd className="text-foreground">{patient.whatsapp ? formatPhone(patient.whatsapp) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-foreground">{patient.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Endereço</dt>
              <dd className="text-foreground">{formatAddress(patient.address) || "—"}</dd>
            </div>
            {patient.insurance_provider ? (
              <>
                <div>
                  <dt className="text-xs text-muted-foreground">Carteirinha</dt>
                  <dd className="text-foreground">{patient.insurance_card_number || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Validade da carteirinha</dt>
                  <dd className="text-foreground">{formatDate(patient.insurance_card_validity)}</dd>
                </div>
              </>
            ) : null}
          </dl>
          {patient.admin_notes ? (
            <div className="mt-4 border-t border-border pt-3">
              <dt className="text-xs text-muted-foreground">Observações administrativas</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{patient.admin_notes}</dd>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Documentos ({documents.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ficam vinculados ao paciente, independentemente da quantidade de cirurgias.
          </p>
        </CardHeader>
        <CardContent>
          {unavailable ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">{unavailable}</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum documento anexado.{canEdit ? " Use “Editar” para anexar." : ""}
            </p>
          ) : (
            <PatientDocumentList documents={documents} canEdit={canEdit} />
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Histórico de cirurgias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os procedimentos já realizados ou agendados para este paciente.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <PatientSurgeryHistoryTable surgeries={surgeries} />
        </CardContent>
      </Card>
    </div>
  );
}
