"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export function MapFilters({
  procedures,
  hospitals,
  insuranceProviders,
}: {
  procedures: { id: string; name: string }[];
  hospitals: { id: string; name: string }[];
  insuranceProviders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters =
    searchParams.get("procedure") ||
    searchParams.get("hospital") ||
    searchParams.get("attendance") ||
    searchParams.get("priority") ||
    searchParams.get("status") ||
    searchParams.get("from") ||
    searchParams.get("to") ||
    searchParams.get("q");

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
      <SearchInput placeholder="Buscar por código..." className="min-w-[200px] max-w-[260px]" />

      <Select
        value={searchParams.get("procedure") ?? "all"}
        onValueChange={(v) => setParam("procedure", v)}
      >
        <SelectTrigger className="w-[200px] shrink-0">
          <SelectValue placeholder="Procedimento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo procedimento</SelectItem>
          {procedures.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("hospital") ?? "all"}
        onValueChange={(v) => setParam("hospital", v)}
      >
        <SelectTrigger className="w-[190px] shrink-0">
          <SelectValue placeholder="Hospital" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo hospital</SelectItem>
          {hospitals.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {h.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("attendance") ?? "all"}
        onValueChange={(v) => setParam("attendance", v)}
      >
        <SelectTrigger className="w-[190px] shrink-0">
          <SelectValue placeholder="Convênio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Convênio / Particular</SelectItem>
          <SelectItem value="particular">Particular</SelectItem>
          {insuranceProviders.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("priority") ?? "all"}
        onValueChange={(v) => setParam("priority", v)}
      >
        <SelectTrigger className="w-[160px] shrink-0">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda prioridade</SelectItem>
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v)}>
        <SelectTrigger className="w-[160px] shrink-0">
          <SelectValue placeholder="Situação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda situação</SelectItem>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          className="w-[150px] shrink-0"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
        <span className="shrink-0 text-xs text-muted-foreground">até</span>
        <Input
          type="date"
          className="w-[150px] shrink-0"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </div>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("procedure");
            params.delete("hospital");
            params.delete("attendance");
            params.delete("priority");
            params.delete("status");
            params.delete("from");
            params.delete("to");
            params.delete("q");
            router.replace(`${pathname}?${params.toString()}`);
          }}
        >
          Limpar filtros
        </Button>
      ) : null}
    </div>
  );
}
