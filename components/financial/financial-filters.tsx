"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";
import { SearchInput } from "@/components/shared/search-input";
import { DateRangeFilter } from "@/components/surgeries/date-range-filter";

const FILTER_KEYS = ["hospital", "q", "status", "from", "to"];

export function FinancialFilters({
  hospitals,
}: {
  hospitals: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function replace(params: URLSearchParams) {
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    replace(params);
  }

  function setRange(range: { from: string; to: string } | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (range?.from) params.set("from", range.from);
    else params.delete("from");
    if (range?.to) params.set("to", range.to);
    else params.delete("to");
    replace(params);
  }

  const activeCount = FILTER_KEYS.filter((k) => searchParams.get(k)).length;
  const hasFilters = activeCount > 0;

  return (
    <div className="flex w-full flex-wrap items-end gap-2">
      <FilterDisclosure activeCount={activeCount}>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
          <SearchInput placeholder="Paciente, código ou procedimento" className="md:w-72" />
          <DateRangeFilter
            label="Data da cirurgia"
            kind="both"
            from={searchParams.get("from") ?? ""}
            to={searchParams.get("to") ?? ""}
            onChange={setRange}
          />
          <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
            <SelectTrigger className="h-10 w-full shrink-0 md:w-[170px]" aria-label="Situação do recebimento">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="undefined">Sem valor definido</SelectItem>
              <SelectItem value="open">A receber</SelectItem>
              <SelectItem value="partial">Recebido parcial</SelectItem>
              <SelectItem value="paid">Quitado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => setParam("hospital", v)}>
            <SelectTrigger className="h-10 w-full shrink-0 md:w-[200px]" aria-label="Hospital">
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
        </div>
      </FilterDisclosure>

      {hasFilters ? (
        <Button variant="ghost" size="sm" className="h-10 shrink-0" onClick={() => router.replace(pathname)}>
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
