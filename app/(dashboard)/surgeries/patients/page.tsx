import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listPatients, calculateAge, type Patient } from "@/lib/data/patients";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PatientRowActions } from "@/components/patients/patient-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const columns: SortableColumn<Patient>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (patient) => patient.full_name,
    cell: (patient) => (
      <Link href={`/surgeries/patients/${patient.id}`} className="font-medium text-foreground hover:underline">
        {patient.full_name}
      </Link>
    ),
  },
  {
    key: "age",
    label: "Idade",
    accessor: (patient) => calculateAge(patient.birth_date),
    cell: (patient) => {
      const age = calculateAge(patient.birth_date);
      return <span className="text-muted-foreground">{age !== null ? `${age} anos` : "—"}</span>;
    },
  },
  {
    key: "phone",
    label: "Telefone",
    accessor: (patient) => patient.phone ?? patient.whatsapp,
    cell: (patient) => (
      <span className="text-muted-foreground">{patient.phone || patient.whatsapp || "—"}</span>
    ),
  },
  {
    key: "insurance",
    label: "Operadora",
    accessor: (patient) => patient.insurance_provider?.name ?? "Particular",
    cell: (patient) => (
      <span className="text-muted-foreground">{patient.insurance_provider?.name || "Particular"}</span>
    ),
  },
  {
    key: "birth_date",
    label: "Nascimento",
    accessor: (patient) => patient.birth_date,
    cell: (patient) => <span className="text-muted-foreground">{formatDate(patient.birth_date)}</span>,
  },
  {
    key: "actions",
    label: "",
    cell: (patient) => <PatientRowActions patient={patient} />,
  },
];

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
        <SortableTable
          columns={columns}
          rows={patients}
          rowKey={(patient) => patient.id}
          emptyMessage={
            q ? "Nenhum paciente encontrado para essa busca." : "Nenhum paciente cadastrado ainda."
          }
        />
      </div>
    </div>
  );
}
