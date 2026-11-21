import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listActivePatientsForSelect } from "@/lib/data/patients";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { SurgeryForm } from "@/components/surgeries/surgery-form";

export default async function NewSurgeryPage() {
  const supabase = await createClient();
  const [patients, hospitals, insuranceProviders, procedures] = await Promise.all([
    listActivePatientsForSelect(supabase),
    listActiveHospitalsForSelect(supabase),
    listActiveInsuranceProvidersForSelect(supabase),
    listActiveProceduresForSelect(supabase),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/kanban"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mapa Cirúrgico
      </Link>

      <h1 className="text-lg font-medium text-foreground">Nova cirurgia</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        {procedures.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Cadastre ao menos um procedimento ativo antes de criar uma cirurgia. Paciente e
            hospital podem ser cadastrados direto neste formulário.
          </p>
        ) : (
          <SurgeryForm
            patients={patients}
            hospitals={hospitals}
            insuranceProviders={insuranceProviders}
            procedures={procedures}
          />
        )}
      </div>
    </div>
  );
}
