"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ScheduleHospitalFilter({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setHospital(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete("hospital");
    else params.set("hospital", value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Select value={searchParams.get("hospital") ?? "all"} onValueChange={setHospital}>
      <SelectTrigger className="w-[200px]">
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
  );
}
