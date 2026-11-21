import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listPatients } from "@/lib/data/patients";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PatientRowActions } from "@/components/patients/patient-row-actions";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("patients");
  const { q } = await searchParams;
  const supabase = await createClient();
  const [patients, insuranceProviders] = await Promise.all([
    listPatients(supabase, q),
    listInsuranceProviders(supabase).then((rows) => rows.filter((r) => r.active)),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um paciente pode ter várias cirurgias ao longo do tempo.
          </p>
        </div>
        <PatientFormDialog insuranceProviders={insuranceProviders} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome, CPF ou telefone..." />
        <p className="text-sm text-muted-foreground">
          {patients.length} paciente{patients.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Operadora</th>
              <th className="px-4 py-3">Nascimento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patients.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={
                  q
                    ? "Nenhum paciente encontrado para essa busca."
                    : "Nenhum paciente cadastrado ainda."
                }
              />
            ) : (
              patients.map((patient) => (
                <PatientFormDialog
                  key={patient.id}
                  patient={patient}
                  insuranceProviders={insuranceProviders}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{patient.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{patient.cpf || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {patient.phone || patient.whatsapp || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {patient.insurance_provider?.name || "Particular"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(patient.birth_date)}
                      </td>
                      <td className="px-4 py-3">
                        <PatientRowActions patient={patient} />
                      </td>
                    </tr>
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
