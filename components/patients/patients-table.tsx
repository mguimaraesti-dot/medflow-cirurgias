"use client";

import Link from "next/link";

import { calculateAge, type Patient } from "@/lib/data/patients";
import { PatientRowActions } from "@/components/patients/patient-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

function buildColumns(surgeryCountByPatient: Record<string, number>): SortableColumn<Patient>[] {
  return [
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
      key: "surgery_count",
      label: "Procedimentos",
      accessor: (patient) => surgeryCountByPatient[patient.id] ?? 0,
      cell: (patient) => {
        const count = surgeryCountByPatient[patient.id] ?? 0;
        return (
          <span className="text-muted-foreground">
            {count} procedimento{count === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "",
      cell: (patient) => <PatientRowActions patient={patient} />,
    },
  ];
}

export function PatientsTable({
  patients,
  surgeryCountByPatient,
  emptyMessage,
}: {
  patients: Patient[];
  surgeryCountByPatient: Record<string, number>;
  emptyMessage: string;
}) {
  const columns = buildColumns(surgeryCountByPatient);
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={patients}
        rowKey={(patient) => patient.id}
        emptyMessage={emptyMessage}
        mobileCardHref={(patient) => `/surgeries/patients/${patient.id}`}
      />
    </div>
  );
}
