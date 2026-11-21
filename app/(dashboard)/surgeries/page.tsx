import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSurgeries, type SurgeryListItem } from "@/lib/data/surgeries";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "default" | "outline"> = {
  active: "secondary",
  rescheduled: "outline",
  cancelled: "destructive",
  completed: "default",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function SurgeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("surgeries");
  const { q } = await searchParams;
  const supabase = await createClient();
  const surgeries = await listSurgeries(supabase, q);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-foreground">Cirurgias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as cirurgias cadastradas, incluindo realizadas e canceladas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kanban">
            <Button variant="outline" size="sm">
              <LayoutGrid className="h-4 w-4" />
              Mapa Cirúrgico
            </Button>
          </Link>
          <Link href="/surgeries/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova cirurgia
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <SearchInput placeholder="Buscar por código (ex: CIR-2026-0001)..." />
        <p className="text-sm text-muted-foreground">
          {surgeries.length} cirurgia{surgeries.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={surgeries}
          rowKey={(surgery) => surgery.id}
          emptyMessage={
            q ? "Nenhuma cirurgia encontrada para essa busca." : "Nenhuma cirurgia cadastrada ainda."
          }
        />
      </div>
    </div>
  );
}

const columns: SortableColumn<SurgeryListItem>[] = [
  {
    key: "code",
    label: "Código",
    accessor: (surgery) => surgery.code,
    cell: (surgery) => (
      <Link href={`/surgeries/${surgery.id}`} className="font-medium text-foreground hover:underline">
        {surgery.code}
      </Link>
    ),
  },
  {
    key: "patient",
    label: "Paciente",
    accessor: (surgery) => surgery.patient?.full_name ?? null,
    cell: (surgery) => <span className="text-muted-foreground">{surgery.patient?.full_name ?? "—"}</span>,
  },
  {
    key: "hospital",
    label: "Hospital",
    accessor: (surgery) => surgery.hospital?.name ?? null,
    cell: (surgery) => <span className="text-muted-foreground">{surgery.hospital?.name ?? "—"}</span>,
  },
  {
    key: "procedure",
    label: "Procedimento",
    accessor: (surgery) => surgery.primary_procedure?.name ?? null,
    cell: (surgery) => (
      <span className="text-muted-foreground">
        {surgery.primary_procedure?.name ?? "—"}
        {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
      </span>
    ),
  },
  {
    key: "indication_date",
    label: "Solicitação",
    accessor: (surgery) => surgery.indication_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.indication_date)}</span>,
  },
  {
    key: "expected_date",
    label: "Prevista",
    accessor: (surgery) => surgery.expected_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.expected_date)}</span>,
  },
  {
    key: "confirmed_date",
    label: "Confirmada",
    accessor: (surgery) => surgery.confirmed_date,
    cell: (surgery) => <span className="text-muted-foreground">{formatDate(surgery.confirmed_date)}</span>,
  },
  {
    key: "status",
    label: "Status",
    accessor: (surgery) => STATUS_LABEL[surgery.status] ?? surgery.status,
    cell: (surgery) => (
      <Badge variant={STATUS_VARIANT[surgery.status] ?? "outline"}>
        {STATUS_LABEL[surgery.status] ?? surgery.status}
      </Badge>
    ),
  },
];
