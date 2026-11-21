"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

export function ScheduleFilters({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    if (key === "status" && value === "sem_data") params.set("view", "list");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const activeCount = ["hospital", "status"].filter((key) => searchParams.get(key)).length;

  return (
    <FilterDisclosure activeCount={activeCount}>
      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[180px]">
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

      <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => setParam("hospital", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[200px]">
          <SelectValue placeholder="Hospital" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os hospitais</SelectItem>
          {hospitals.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterDisclosure>
  );
}
