"use client";

import type { Holiday } from "@/lib/data/holidays";
import { Badge } from "@/components/ui/badge";
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

export function HolidaysTable({ holidays, emptyMessage }: { holidays: Holiday[]; emptyMessage: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
      <SortableTable
        columns={columns}
        rows={holidays}
        rowKey={(holiday) => holiday.id}
        emptyMessage={emptyMessage}
        defaultSort={{ key: "date", direction: "asc" }}
        rowClassName={() => "cursor-pointer transition-colors hover:bg-muted/60"}
        wrapRow={(holiday, rowNode) => (
          <HolidayFormDialog key={holiday.id} holiday={holiday} trigger={rowNode} />
        )}
      />
    </div>
  );
}
