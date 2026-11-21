import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getPatient, calculateAge } from "@/lib/data/patients";
import { listSurgeriesByPatient } from "@/lib/data/surgeries";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { deriveScheduleStatus, SCHEDULE_STATUS_LABEL, SCHEDULE_STATUS_COLOR } from "@/lib/schedule-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyRow } from "@/components/shared/empty-row";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";

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

  const [patient, surgeries, insuranceProviders] = await Promise.all([
    getPatient(supabase, id),
    listSurgeriesByPatient(supabase, id),
    listInsuranceProviders(supabase).then((rows) => rows.filter((r) => r.active)),
  ]);

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">{patient.full_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {age !== null ? `${age} anos` : "Idade não informada"} ·{" "}
            {patient.insurance_provider?.name ?? "Particular"}
          </p>
        </div>
        <PatientFormDialog patient={patient} insuranceProviders={insuranceProviders} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dados do paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd className="text-foreground">{patient.cpf || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nascimento</dt>
              <dd className="text-foreground">{formatDate(patient.birth_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Celular</dt>
              <dd className="text-foreground">{patient.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Telefone de contato</dt>
              <dd className="text-foreground">{patient.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">E-mail</dt>
              <dd className="text-foreground">{patient.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Endereço</dt>
              <dd className="text-foreground">{patient.address || "—"}</dd>
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
          <CardTitle>Histórico de cirurgias</CardTitle>
          <p className="text-sm text-muted-foreground">
            Todos os procedimentos já realizados ou agendados para este paciente.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-xl">
            <table className="w-full text-sm">
              <thead className="border-b border-t border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Procedimento</th>
                  <th className="px-4 py-3">Hospital</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {surgeries.length === 0 ? (
                  <EmptyRow colSpan={5} message="Nenhuma cirurgia registrada para este paciente ainda." />
                ) : (
                  surgeries.map((surgery) => {
                    const status = deriveScheduleStatus(surgery);
                    return (
                      <tr key={surgery.id} className="hover:bg-muted">
                        <td className="px-4 py-3">
                          <Link
                            href={`/surgeries/${surgery.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {surgery.code}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {surgery.primary_procedure?.name ?? "—"}
                          {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{surgery.hospital?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SCHEDULE_STATUS_COLOR[status].badge}`}
                          >
                            {SCHEDULE_STATUS_LABEL[status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
