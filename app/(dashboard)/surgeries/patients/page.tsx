import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listPatients } from "@/lib/data/patients";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const [patients, insuranceProviders] = await Promise.all([
    listPatients(supabase, q),
    listInsuranceProviders(supabase).then((rows) => rows.filter((r) => r.active)),
  ]);

  return (
    <div>
      <Link
        href="/surgeries"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Cirurgias
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Pacientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Um paciente pode ter várias cirurgias ao longo do tempo.
          </p>
        </div>
        <PatientFormDialog insuranceProviders={insuranceProviders} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome, CPF ou telefone..." />
        <p className="text-sm text-slate-500">
          {patients.length} paciente{patients.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">CPF</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Operadora</th>
              <th className="px-4 py-3">Nascimento</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
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
                <tr key={patient.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{patient.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.cpf || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {patient.phone || patient.whatsapp || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {patient.insurance_provider?.name || "Particular"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(patient.birth_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <PatientFormDialog patient={patient} insuranceProviders={insuranceProviders} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
