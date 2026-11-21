"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/search-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterDisclosure } from "@/components/shared/filter-disclosure";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day; // volta até a segunda-feira
  date.setDate(date.getDate() + diff);
  return date;
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Calcula o intervalo de um atalho de período, com base na data de hoje. */
function presetRange(preset: string): { from: string; to: string } | null {
  const today = new Date();
  if (preset === "week") {
    return { from: toISODate(startOfWeek(today)), to: toISODate(endOfWeek(today)) };
  }
  if (preset === "month") {
    return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
  }
  if (preset === "last_month") {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { from: toISODate(startOfMonth(prev)), to: toISODate(endOfMonth(prev)) };
  }
  return null;
}

const PRESETS = ["week", "month", "last_month"] as const;

/** Período: menu com atalhos (esta semana / este mês / mês anterior) em
 * vez de dois campos de data sempre visíveis — "Personalizado" ainda
 * revela os dois campos pra quem quiser escolher datas específicas. */
function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function matchedPreset(): string {
    if (!from && !to) return "all";
    const match = PRESETS.find((p) => {
      const range = presetRange(p);
      return range && range.from === from && range.to === to;
    });
    return match ?? "custom";
  }

  const [selected, setSelected] = useState(matchedPreset);

  // Só re-sincroniza quando as datas na URL baterem com um atalho
  // conhecido (inclusive "nenhuma data" = "all") — assim, ao escolher
  // "Personalizado" e ainda não ter digitado nada, não volta sozinho pra
  // "Todo período" só porque os campos estão vazios.
  useEffect(() => {
    const match = matchedPreset();
    if (match !== "custom") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a URL (back/forward, "Limpar filtros"), não é estado derivável em render
      setSelected(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function applyRange(next: { from: string; to: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.from) params.set("from", next.from);
    else params.delete("from");
    if (next.to) params.set("to", next.to);
    else params.delete("to");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function handlePresetChange(value: string) {
    setSelected(value);
    if (value === "all") {
      applyRange({ from: "", to: "" });
      return;
    }
    if (value === "custom") return; // espera o usuário preencher as datas
    const range = presetRange(value);
    if (range) applyRange(range);
  }

  return (
    // flex-wrap: com "Personalizado" selecionado, os 2 campos de data +
    // "até" não cabem numa linha só no mobile (mesmo problema corrigido
    // em dashboard-period-filter.tsx).
    <div className="flex w-full flex-wrap items-center gap-1.5 md:w-auto">
      <Select value={selected} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full shrink-0 md:w-[135px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo período</SelectItem>
          <SelectItem value="week">Esta semana</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês anterior</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {selected === "custom" ? (
        <>
          <Input
            type="date"
            className="w-[calc(50%-12px)] shrink-0 md:w-[150px]"
            value={from}
            onChange={(e) => applyRange({ from: e.target.value, to })}
          />
          <span className="shrink-0 text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-[calc(50%-12px)] shrink-0 md:w-[150px]"
            value={to}
            onChange={(e) => applyRange({ from, to: e.target.value })}
          />
        </>
      ) : null}
    </div>
  );
}

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

  const activeCount = ["procedure", "hospital", "attendance", "priority", "status", "from", "q"].filter(
    (key) => searchParams.get(key)
  ).length;

  return (
    <FilterDisclosure activeCount={activeCount}>
      <SearchInput
        placeholder="Buscar por código ou paciente..."
        className="w-full max-w-none md:min-w-[170px] md:max-w-[220px]"
      />

      <Select value={searchParams.get("procedure") ?? "all"} onValueChange={(v) => setParam("procedure", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[165px]">
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

      <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => setParam("hospital", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[150px]">
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

      <Select value={searchParams.get("attendance") ?? "all"} onValueChange={(v) => setParam("attendance", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[150px]">
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

      <Select value={searchParams.get("priority") ?? "all"} onValueChange={(v) => setParam("priority", v)}>
        <SelectTrigger className="w-full shrink-0 md:w-[130px]">
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
        <SelectTrigger className="w-full shrink-0 md:w-[130px]">
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

      <DateRangeFilter />
    </FilterDisclosure>
  );
}

const FILTER_PARAM_KEYS = [
  "procedure",
  "hospital",
  "attendance",
  "priority",
  "status",
  "from",
  "to",
  "q",
  "overdue",
  "pending",
  "scheduled",
];

/**
 * Separado de `MapFilters` de propósito: fica ao lado do ViewToggle
 * (Kanban/Lista) em vez de dentro da linha de filtros, que já quebra
 * bastante — assim os dois sempre ficam juntos na mesma linha, sem
 * desperdiçar uma linha inteira só pro botão de limpar.
 */
export function ClearFiltersButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasFilters = FILTER_PARAM_KEYS.some((key) => searchParams.get(key));
  if (!hasFilters) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0"
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        FILTER_PARAM_KEYS.forEach((key) => params.delete(key));
        router.replace(`${pathname}?${params.toString()}`);
      }}
    >
      Limpar filtros
    </Button>
  );
}
