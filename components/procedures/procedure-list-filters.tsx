"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

const ALL = "__all";

/** Pesquisa + filtros (especialidade, status, local). Tudo na URL; qualquer mudança volta à página 1. */
export function ProcedureListFilters({
  specialties,
  locations,
  activeCount,
}: {
  specialties: string[];
  locations: string[];
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
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
    for (const k of ["sort", "dir", "size"]) {
      const v = searchParams.get(k);
      if (v) params.set(k, v);
    }
    setSearch("");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  const select = (id: string, label: string, param: string, options: { value: string; label: string }[], allLabel: string) => (
    <div className="flex min-w-[10rem] flex-1 flex-col gap-1 md:flex-none">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={searchParams.get(param) || ALL} onValueChange={(v) => update({ [param]: v === ALL ? undefined : v })}>
        <SelectTrigger id={id} className="h-10 md:w-52">
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

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por nome, código interno, código TUSS ou especialidade..."
          aria-label="Buscar procedimentos"
          className="h-10 pl-9"
        />
      </div>
      <FilterDisclosure activeCount={activeCount}>
        <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-start">
          {select("f-specialty", "Especialidade", "specialty", specialties.map((s) => ({ value: s, label: s })), "Todas")}
          {select(
            "f-status",
            "Status",
            "status",
            [
              { value: "active", label: "Ativo" },
              { value: "inactive", label: "Inativo" },
            ],
            "Todos"
          )}
          {select("f-location", "Local de realização", "location", locations.map((l) => ({ value: l, label: l })), "Todos")}
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-10 items-center gap-1.5 self-start rounded-md px-2 text-sm font-medium text-primary hover:underline md:mt-5"
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
