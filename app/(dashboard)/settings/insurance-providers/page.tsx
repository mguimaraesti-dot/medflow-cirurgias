import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { InsuranceProviderFormDialog } from "@/components/insurance-providers/insurance-provider-form-dialog";
import { InsuranceProvidersTable } from "@/components/insurance-providers/insurance-providers-table";

export default async function InsuranceProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("settings");
  const { q } = await searchParams;
  const supabase = await createClient();
  const providers = await listInsuranceProviders(supabase, q);

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
          <h1 className="text-lg font-medium text-foreground">Operadoras e convênios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usadas em autorizações, faturamento e regras de convênio das cirurgias.
          </p>
        </div>
        <InsuranceProviderFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {providers.length} operadora{providers.length === 1 ? "" : "s"}
        </p>
      </div>

      <InsuranceProvidersTable
        providers={providers}
        emptyMessage={
          q ? "Nenhuma operadora encontrada para essa busca." : "Nenhuma operadora cadastrada ainda."
        }
      />
    </div>
  );
}
