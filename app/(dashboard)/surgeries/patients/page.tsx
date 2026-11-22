import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listPatients } from "@/lib/data/patients";
import { countSurgeriesByPatient } from "@/lib/data/surgeries";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PatientsTable } from "@/components/patients/patients-table";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("patients");
  const { q } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const canEdit = user ? await hasPermission(user, "patients", "edit") : false;
  const [patients, insuranceProviders, surgeryCountByPatient] = await Promise.all([
    listPatients(supabase, q),
    listInsuranceProviders(supabase).then((rows) => rows.filter((r) => r.active)),
    countSurgeriesByPatient(supabase),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um paciente pode ter várias cirurgias ao longo do tempo.
          </p>
        </div>
        {canEdit ? <PatientFormDialog insuranceProviders={insuranceProviders} /> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar por nome, CPF ou telefone..." />
        <p className="text-sm text-muted-foreground">
          {patients.length} paciente{patients.length === 1 ? "" : "s"}
        </p>
      </div>

      <PatientsTable
        patients={patients}
        surgeryCountByPatient={surgeryCountByPatient}
        emptyMessage={q ? "Nenhum paciente encontrado para essa busca." : "Nenhum paciente cadastrado ainda."}
      />
    </div>
  );
}
