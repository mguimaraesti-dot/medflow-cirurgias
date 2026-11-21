import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

export function UpcomingSurgeriesList({ surgeries }: { surgeries: ScheduleSurgeryItem[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Próximas cirurgias</CardTitle>
        <Link href="/schedule" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
          Ver agenda
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {surgeries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma cirurgia confirmada ou prevista nos próximos dias.</p>
        ) : (
          <ul className="divide-y divide-border">
            {surgeries.map((surgery) => {
              const scheduleStatus = deriveScheduleStatus(surgery);
              const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
              const date = surgery.confirmed_date ?? surgery.expected_date;
              const time = formatTime(surgery.confirmed_time);
              return (
                <li key={surgery.id} className="py-2.5">
                  <Link href={`/surgeries/${surgery.id}`} className="flex items-center justify-between gap-3 hover:text-foreground">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{surgery.patient?.full_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {surgery.primary_procedure?.name ?? "—"} — {surgery.hospital?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(date)}
                        {time ? ` às ${time}` : ""}
                      </span>
                      <Badge variant="outline" className={color.badge}>
                        {SCHEDULE_STATUS_LABEL[scheduleStatus]}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
