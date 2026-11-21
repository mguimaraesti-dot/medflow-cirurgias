import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHolidays } from "@/lib/data/holidays";
import { EmptyRow } from "@/components/shared/empty-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";
import { HolidayRowActions } from "@/components/holidays/holiday-row-actions";

const SCOPE_LABEL: Record<string, string> = {
  national: "Nacional",
  state: "Estadual",
  municipal: "Municipal",
};

function formatDate(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

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
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Abrangência</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {holidays.length === 0 ? (
              <EmptyRow colSpan={5} message={`Nenhum feriado cadastrado em ${year}.`} />
            ) : (
              holidays.map((holiday) => (
                <HolidayFormDialog
                  key={holiday.id}
                  holiday={holiday}
                  trigger={
                    <tr className="cursor-pointer transition-colors hover:bg-muted/60">
                      <td className="px-4 py-3 font-medium text-foreground">{formatDate(holiday.date)}</td>
                      <td className="px-4 py-3 text-foreground">{holiday.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {SCOPE_LABEL[holiday.scope]}
                        {holiday.state ? ` — ${holiday.state}` : ""}
                        {holiday.city ? ` / ${holiday.city}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {holiday.is_facultative ? (
                          <Badge variant="outline">Facultativo</Badge>
                        ) : (
                          <Badge>Feriado</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <HolidayRowActions holiday={holiday} />
                      </td>
                    </tr>
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
