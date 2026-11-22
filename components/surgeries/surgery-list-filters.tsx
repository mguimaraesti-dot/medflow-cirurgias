"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

import { SITUATIONS, SITUATION_LABEL } from "@/lib/surgery-situation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangeFilter } from "@/components/surgeries/date-range-filter";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

const ALL = "__all";

type Option = { id: string; name: string };

/**
 * Barra de pesquisa + filtros. Tudo vive na URL (compartilhável e mantido ao
 * paginar/ordenar); qualquer mudança volta pra página 1.
 */
export function SurgeryListFilters({
  hospitals,
  activeCount,
}: {
  hospitals: Option[];
  /** Quantos filtros estão ativos (inclui a busca). */
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Limpar filtros" (ou voltar no histórico) muda a URL por fora: ressincroniza o campo.
  const urlQ = searchParams.get("q") ?? "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(urlQ);
  }, [urlQ]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  function onSearch(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() || undefined }), 300);
  }

  function clearAll() {
    const params = new URLSearchParams();
    // mantém ordenação e tamanho da página — não são filtros
    for (const k of ["sort", "dir", "size"]) {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    }
    setSearch("");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  const get = (k: string) => searchParams.get(k) ?? "";

  const selectFilter = (
    id: string,
    label: string,
    param: string,
    options: { value: string; label: string }[],
    allLabel: string
  ) => (
    <div className="flex min-w-[10rem] flex-1 flex-col gap-1 md:flex-none">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={get(param) || ALL} onValueChange={(v) => update({ [param]: v === ALL ? undefined : v })}>
        <SelectTrigger id={id} className="h-10 md:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const dateRange = (label: string, kind: "past" | "future", fromKey: string, toKey: string) => (
    <DateRangeFilter
      label={label}
      kind={kind}
      from={get(fromKey)}
      to={get(toKey)}
      onChange={(r) => update({ [fromKey]: r?.from || undefined, [toKey]: r?.to || undefined })}
    />
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por código, paciente, hospital, procedimento ou código TUSS..."
          aria-label="Buscar cirurgias"
          className="h-10 pl-9"
        />
      </div>

      <FilterDisclosure activeCount={activeCount}>
        <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-start">
          {selectFilter(
            "f-status",
            "Status",
            "status",
            SITUATIONS.map((s) => ({ value: s, label: SITUATION_LABEL[s] })),
            "Todos"
          )}
          {selectFilter(
            "f-hospital",
            "Hospital",
            "hospital",
            hospitals.map((h) => ({ value: h.id, label: h.name })),
            "Todos"
          )}
          {selectFilter(
            "f-attendance",
            "Tipo de atendimento",
            "attendance",
            [
              { value: "particular", label: "Particular" },
              { value: "convenio", label: "Convênio" },
            ],
            "Todos"
          )}
          {selectFilter(
            "f-priority",
            "Prioridade",
            "priority",
            [
              { value: "low", label: "Baixa" },
              { value: "normal", label: "Normal" },
              { value: "high", label: "Alta" },
              { value: "urgent", label: "Urgente" },
            ],
            "Todas"
          )}
          {dateRange("Solicitação", "past", "rf", "rt")}
          {dateRange("Data prevista", "future", "ef", "et")}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-10 items-center gap-1.5 self-start rounded-md px-2 text-sm font-medium text-primary hover:underline md:mt-6"
            >
              <RefreshCw className="h-4 w-4" />
              Limpar filtros
            </button>
          ) : null}
        </div>
      </FilterDisclosure>
    </div>
  );
}
