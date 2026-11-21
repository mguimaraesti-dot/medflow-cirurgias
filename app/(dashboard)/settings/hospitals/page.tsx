import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHospitals } from "@/lib/data/hospitals";
import { SearchInput } from "@/components/shared/search-input";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { HospitalsTable } from "@/components/hospitals/hospitals-table";

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Hospitais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toda cirurgia precisa estar vinculada a um hospital.
          </p>
        </div>
        <HospitalFormDialog />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {hospitals.length} hospital{hospitals.length === 1 ? "" : "is"}
        </p>
      </div>

      <HospitalsTable
        hospitals={hospitals}
        emptyMessage={
          q ? "Nenhum hospital encontrado para essa busca." : "Nenhum hospital cadastrado ainda."
        }
      />
    </div>
  );
}
