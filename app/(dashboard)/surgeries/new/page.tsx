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
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mapa Cirúrgico
      </Link>

      <h1 className="text-lg font-medium text-slate-900">Nova cirurgia</h1>
      <p className="mt-1 text-sm text-slate-500">
        A cirurgia entra automaticamente na etapa &quot;Nova indicação&quot;. O código
        (CIR-AAAA-NNNN) é gerado pelo sistema.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {patients.length === 0 || hospitals.length === 0 || procedures.length === 0 ? (
          <p className="text-sm text-amber-700">
            Cadastre ao menos um paciente, um hospital e um procedimento ativos antes de criar uma
            cirurgia.
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
