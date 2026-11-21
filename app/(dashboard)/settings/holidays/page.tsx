import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listHolidays } from "@/lib/data/holidays";
import { Button } from "@/components/ui/button";
import { HolidayFormDialog } from "@/components/holidays/holiday-form-dialog";
import { HolidaysTable } from "@/components/holidays/holidays-table";

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

      <HolidaysTable holidays={holidays} emptyMessage={`Nenhum feriado cadastrado em ${year}.`} />
    </div>
  );
}
