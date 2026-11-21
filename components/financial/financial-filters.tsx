"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

export function FinancialFilters({
  hospitals,
}: {
  hospitals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = searchParams.toString().length > 0;
  const activeCount = hasFilters ? 1 : 0;

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
      <FilterDisclosure activeCount={activeCount}>
        <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => setParam("hospital", v)}>
          <SelectTrigger className="w-full shrink-0 md:w-[180px]">
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

      {hasFilters ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => router.replace(pathname)}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
