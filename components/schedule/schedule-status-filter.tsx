"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";

export function ScheduleStatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete("status");
    else params.set("status", value);
    // Sem data não tem onde entrar no mês — muda pra lista junto.
    if (value === "sem_data") params.set("view", "list");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={searchParams.get("status") ?? "all"} onValueChange={setStatus}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os status</SelectItem>
        {Object.entries(SCHEDULE_STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
