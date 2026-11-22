import Link from "next/link";
import { ArrowLeft, CalendarPlus, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleEdit } from "@/lib/auth/guard";
import { listActivePatientsForSelect } from "@/lib/data/patients";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { SurgeryForm } from "@/components/surgeries/surgery-form";

export default async function NewSurgeryPage() {
  await requireModuleEdit("surgeries");
  const supabase = await createClient();
  const [patients, hospitals, insuranceProviders, procedures] = await Promise.all([
    listActivePatientsForSelect(supabase),
    listActiveHospitalsForSelect(supabase),
    listActiveInsuranceProvidersForSelect(supabase),
    listActiveProceduresForSelect(supabase),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="Navegação" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/kanban" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Mapa Cirúrgico
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Nova Cirurgia</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CalendarPlus className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Nova Cirurgia</h1>
          <p className="text-sm text-muted-foreground">Cadastre uma nova cirurgia de forma rápida e organizada.</p>
        </div>
      </div>

      <div className="mt-6">
        {procedures.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Cadastre ao menos um procedimento ativo antes de criar uma cirurgia. Paciente e
              hospital podem ser cadastrados direto neste formulário.
            </p>
          </div>
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
