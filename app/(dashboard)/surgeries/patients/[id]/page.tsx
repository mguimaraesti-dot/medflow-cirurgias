import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getPatient, calculateAge } from "@/lib/data/patients";
import { listSurgeriesByPatient } from "@/lib/data/surgeries";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
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
          <PatientSurgeryHistoryTable surgeries={surgeries} />
        </CardContent>
      </Card>
    </div>
  );
}
