import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listInsuranceProviders, type InsuranceProvider } from "@/lib/data/insurance-providers";
import { SearchInput } from "@/components/shared/search-input";
import { ActiveBadge } from "@/components/shared/active-badge";
import { InsuranceProviderFormDialog } from "@/components/insurance-providers/insurance-provider-form-dialog";
import { InsuranceProviderRowActions } from "@/components/insurance-providers/insurance-provider-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const columns: SortableColumn<InsuranceProvider>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (provider) => provider.name,
    cell: (provider) => <span className="font-medium text-foreground">{provider.name}</span>,
  },
  {
    key: "code",
    label: "Código",
    accessor: (provider) => provider.code,
    cell: (provider) => <span className="text-muted-foreground">{provider.code || "—"}</span>,
  },
  {
    key: "phone",
    label: "Telefone",
    accessor: (provider) => provider.phone,
    cell: (provider) => <span className="text-muted-foreground">{provider.phone || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (provider) => (provider.active ? 1 : 0),
    cell: (provider) => <ActiveBadge active={provider.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (provider) => <InsuranceProviderRowActions provider={provider} />,
  },
];

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

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={providers}
          rowKey={(provider) => provider.id}
          emptyMessage={
            q ? "Nenhuma operadora encontrada para essa busca." : "Nenhuma operadora cadastrada ainda."
          }
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(provider, rowNode) => (
            <InsuranceProviderFormDialog key={provider.id} provider={provider} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
