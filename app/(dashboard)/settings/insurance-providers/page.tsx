import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listInsuranceProviders } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyRow } from "@/components/shared/empty-row";
import { ActiveBadge } from "@/components/shared/active-badge";
import { InsuranceProviderFormDialog } from "@/components/insurance-providers/insurance-provider-form-dialog";
import { InsuranceProviderActiveToggle } from "@/components/insurance-providers/insurance-provider-active-toggle";

export default async function InsuranceProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
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

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {providers.length === 0 ? (
              <EmptyRow
                colSpan={5}
                message={
                  q
                    ? "Nenhuma operadora encontrada para essa busca."
                    : "Nenhuma operadora cadastrada ainda."
                }
              />
            ) : (
              providers.map((provider) => (
                <tr key={provider.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{provider.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{provider.code || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{provider.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={provider.active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <InsuranceProviderFormDialog provider={provider} />
                      <InsuranceProviderActiveToggle id={provider.id} active={provider.active} />
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
