"use client";

import type { InsuranceProvider } from "@/lib/data/insurance-providers";
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

export function InsuranceProvidersTable({
  providers,
  emptyMessage,
}: {
  providers: InsuranceProvider[];
  emptyMessage: string;
}) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={providers}
        rowKey={(provider) => provider.id}
        emptyMessage={emptyMessage}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(provider, rowNode) => (
          <InsuranceProviderFormDialog key={provider.id} provider={provider} trigger={rowNode} />
        )}
      />
    </div>
  );
}
