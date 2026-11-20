import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listHospitals } from "@/lib/data/hospitals";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { HospitalActiveToggle } from "@/components/hospitals/hospital-active-toggle";

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const hospitals = await listHospitals(supabase, q);

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Configurações
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900">Hospitais</h1>
          <p className="mt-1 text-sm text-slate-500">
            Toda cirurgia precisa estar vinculada a um hospital.
          </p>
        </div>
        <HospitalFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-slate-500">
          {hospitals.length} hospital{hospitals.length === 1 ? "" : "is"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hospitals.length === 0 ? (
              <EmptyRow
                colSpan={5}
                message={
                  q
                    ? "Nenhum hospital encontrado para essa busca."
                    : "Nenhum hospital cadastrado ainda."
                }
              />
            ) : (
              hospitals.map((hospital) => (
                <tr key={hospital.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{hospital.name}</td>
                  <td className="px-4 py-3 text-slate-600">{hospital.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{hospital.email || "—"}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={hospital.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <HospitalFormDialog hospital={hospital} />
                      <HospitalActiveToggle id={hospital.id} active={hospital.active} />
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
