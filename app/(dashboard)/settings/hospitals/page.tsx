import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHospitals, type Hospital } from "@/lib/data/hospitals";
import { SearchInput } from "@/components/shared/search-input";
import { ActiveBadge } from "@/components/shared/active-badge";
import { HospitalFormDialog } from "@/components/hospitals/hospital-form-dialog";
import { HospitalRowActions } from "@/components/hospitals/hospital-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const columns: SortableColumn<Hospital>[] = [
  {
    key: "name",
    label: "Nome",
    accessor: (hospital) => hospital.name,
    cell: (hospital) => <span className="font-medium text-foreground">{hospital.name}</span>,
  },
  {
    key: "phone",
    label: "Telefone",
    accessor: (hospital) => hospital.phone,
    cell: (hospital) => <span className="text-muted-foreground">{hospital.phone || "—"}</span>,
  },
  {
    key: "email",
    label: "E-mail",
    accessor: (hospital) => hospital.email,
    cell: (hospital) => <span className="text-muted-foreground">{hospital.email || "—"}</span>,
  },
  {
    key: "active",
    label: "Status",
    accessor: (hospital) => (hospital.active ? 1 : 0),
    cell: (hospital) => <ActiveBadge active={hospital.active} />,
  },
  {
    key: "actions",
    label: "",
    cell: (hospital) => <HospitalRowActions hospital={hospital} />,
  },
];

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Hospitais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toda cirurgia precisa estar vinculada a um hospital.
          </p>
        </div>
        <HospitalFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome..." />
        <p className="text-sm text-muted-foreground">
          {hospitals.length} hospital{hospitals.length === 1 ? "" : "is"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={hospitals}
          rowKey={(hospital) => hospital.id}
          emptyMessage={
            q ? "Nenhum hospital encontrado para essa busca." : "Nenhum hospital cadastrado ainda."
          }
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(hospital, rowNode) => (
            <HospitalFormDialog key={hospital.id} hospital={hospital} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
