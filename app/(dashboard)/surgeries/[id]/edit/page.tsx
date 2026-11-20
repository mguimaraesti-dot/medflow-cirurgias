import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getSurgery } from "@/lib/data/surgeries";
import { listActivePatientsForSelect } from "@/lib/data/patients";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { SurgeryForm } from "@/components/surgeries/surgery-form";

export default async function EditSurgeryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [surgery, patients, hospitals, insuranceProviders, procedures] = await Promise.all([
    getSurgery(supabase, id),
    listActivePatientsForSelect(supabase),
    listActiveHospitalsForSelect(supabase),
    listActiveInsuranceProvidersForSelect(supabase),
    listActiveProceduresForSelect(supabase),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/surgeries/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {surgery.code}
      </Link>

      <h1 className="text-lg font-medium text-foreground">Editar cirurgia {surgery.code}</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <SurgeryForm
          surgery={surgery}
          patients={patients}
          hospitals={hospitals}
          insuranceProviders={insuranceProviders}
          procedures={procedures}
        />
      </div>
    </div>
  );
}
