import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleEdit } from "@/lib/auth/guard";
import { getSurgery } from "@/lib/data/surgeries";
import { listActivePatientsForSelect } from "@/lib/data/patients";
import { listActiveHospitalsForSelect } from "@/lib/data/hospitals";
import { listActiveInsuranceProvidersForSelect } from "@/lib/data/insurance-providers";
import { listActiveProceduresForSelect } from "@/lib/data/procedures";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listSurgeryMaterialItems, listSurgeryMaterialItemsForEdit, type SurgeryMaterialEditItem } from "@/lib/data/operations";
import { SurgeryForm } from "@/components/surgeries/surgery-form";

export default async function EditSurgeryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleEdit("surgeries");
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  const canUploadCards = user ? await hasPermission(user, "patients", "edit") : false;
  // Itens com validação/IA exigem a migration 0026; sem ela, cai para a lista simples.
  const loadItems = async (): Promise<SurgeryMaterialEditItem[]> => {
    try {
      return await listSurgeryMaterialItemsForEdit(supabase, id);
    } catch {
      const basic = await listSurgeryMaterialItems(supabase, id);
      return basic.map((m) => ({ ...m, validated: false, ai_suggested: false }));
    }
  };
  const [surgery, patients, hospitals, insuranceProviders, procedures, materialItems] = await Promise.all([
    getSurgery(supabase, id),
    listActivePatientsForSelect(supabase),
    listActiveHospitalsForSelect(supabase),
    listActiveInsuranceProvidersForSelect(supabase),
    listActiveProceduresForSelect(supabase),
    loadItems(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={`/surgeries/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {surgery.code}
      </Link>

      <h1 className="text-xl font-semibold text-foreground">Editar cirurgia {surgery.code}</h1>

      <div className="mt-6">
        <SurgeryForm
          surgery={surgery}
          patients={patients}
          hospitals={hospitals}
          insuranceProviders={insuranceProviders}
          procedures={procedures}
          materialItems={materialItems}
          canUploadCards={canUploadCards}
        />
      </div>
    </div>
  );
}
