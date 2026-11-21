import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHolidays, type Holiday } from "@/lib/data/holidays";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";
import { HolidayRowActions } from "@/components/holidays/holiday-row-actions";
import { SortableTable, type SortableColumn } from "@/components/shared/sortable-table";

const SCOPE_LABEL: Record<string, string> = {
  national: "Nacional",
  state: "Estadual",
  municipal: "Municipal",
};

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

const columns: SortableColumn<Holiday>[] = [
  {
    key: "date",
    label: "Data",
    accessor: (holiday) => holiday.date,
    cell: (holiday) => <span className="font-medium text-foreground">{formatDate(holiday.date)}</span>,
  },
  {
    key: "name",
    label: "Nome",
    accessor: (holiday) => holiday.name,
    cell: (holiday) => <span className="text-foreground">{holiday.name}</span>,
  },
  {
    key: "scope",
    label: "Abrangência",
    accessor: (holiday) => `${SCOPE_LABEL[holiday.scope]} ${holiday.state ?? ""} ${holiday.city ?? ""}`,
    cell: (holiday) => (
      <span className="text-muted-foreground">
        {SCOPE_LABEL[holiday.scope]}
        {holiday.state ? ` — ${holiday.state}` : ""}
        {holiday.city ? ` / ${holiday.city}` : ""}
      </span>
    ),
  },
  {
    key: "type",
    label: "Tipo",
    accessor: (holiday) => (holiday.is_facultative ? 1 : 0),
    cell: (holiday) =>
      holiday.is_facultative ? <Badge variant="outline">Facultativo</Badge> : <Badge>Feriado</Badge>,
  },
  {
    key: "actions",
    label: "",
    cell: (holiday) => <HolidayRowActions holiday={holiday} />,
  },
];

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireModuleView("settings");
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const supabase = await createClient();
  const holidays = await listHolidays(supabase, { from: `${year}-01-01`, to: `${year}-12-31` });

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
          <h1 className="text-lg font-medium text-foreground">Feriados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Exibidos na Agenda como destaque visual — não contam como cirurgia nem bloqueiam
            agendamento. Nacionais de 2025 a 2030 já vêm cadastrados; estaduais e municipais são
            cadastrados aqui manualmente.
          </p>
        </div>
        <HolidayFormDialog />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link href={`/settings/holidays?year=${year - 1}`}>
            <Button type="button" variant="outline" size="sm">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <span className="px-2 text-sm font-medium text-foreground">{year}</span>
          <Link href={`/settings/holidays?year=${year + 1}`}>
            <Button type="button" variant="outline" size="sm">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {holidays.length} feriado{holidays.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <SortableTable
          columns={columns}
          rows={holidays}
          rowKey={(holiday) => holiday.id}
          emptyMessage={`Nenhum feriado cadastrado em ${year}.`}
          defaultSort={{ key: "date", direction: "asc" }}
          rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
          wrapRow={(holiday, rowNode) => (
            <HolidayFormDialog key={holiday.id} holiday={holiday} trigger={rowNode} />
          )}
        />
      </div>
    </div>
  );
}
