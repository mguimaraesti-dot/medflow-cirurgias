import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHospitals } from "@/lib/data/hospitals";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { HospitalRowActions } from "@/components/hospitals/hospital-row-actions";

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("settings");
  const { q } = await searchParams;
  const supabase = await createClient();
  const hospitals = await listHospitals(supabase, q);

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Configurações
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Hospitais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toda cirurgia precisa estar vinculada a um hospital.
          </p>
        </div>
        <HospitalFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {hospitals.length} hospital{hospitals.length === 1 ? "" : "is"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
                <HospitalFormDialog
                  key={hospital.id}
                  hospital={hospital}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{hospital.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{hospital.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{hospital.email || "—"}</td>
                      <td className="px-4 py-3">
                        <ActiveBadge active={hospital.active} />
                      </td>
                      <td className="px-4 py-3">
                        <HospitalRowActions hospital={hospital} />
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
