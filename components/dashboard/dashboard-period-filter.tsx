"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Mesma ideia do atalho de período do Mapa Cirúrgico e dos Relatórios —
 * "Últimos 6 meses" é o padrão daqui (mantém o comportamento que o
 * Dashboard já tinha antes de existir filtro). */
function presetRange(preset: string): { from: string; to: string } | null {
  const today = new Date();
  if (preset === "6m") {
    const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    return { from: toISODate(start), to: toISODate(today) };
  }
  if (preset === "month") {
    return { from: toISODate(startOfMonth(today)), to: toISODate(endOfMonth(today)) };
  }
  if (preset === "last_month") {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { from: toISODate(startOfMonth(prev)), to: toISODate(endOfMonth(prev)) };
  }
  if (preset === "year") {
    return { from: `${today.getFullYear()}-01-01`, to: `${today.getFullYear()}-12-31` };
  }
  return null;
}

const PRESETS = ["6m", "month", "last_month", "year"] as const;

export function DashboardPeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  function matchedPreset(): string {
    if (!from && !to) return "6m";
    const match = PRESETS.find((p) => {
      const range = presetRange(p);
      return range && range.from === from && range.to === to;
    });
    return match ?? "custom";
  }

  const [selected, setSelected] = useState(matchedPreset);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a URL (back/forward), não é estado derivável em render
    setSelected(matchedPreset());
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
    if (value === "custom") return; // espera o usuário preencher as datas
    if (value === "6m") {
      applyRange({ from: "", to: "" });
      return;
    }
    const range = presetRange(value);
    if (range) applyRange(range);
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={selected} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[150px] shrink-0">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="6m">Últimos 6 meses</SelectItem>
          <SelectItem value="month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês anterior</SelectItem>
          <SelectItem value="year">Este ano</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {selected === "custom" ? (
        <>
          <Input
            type="date"
            className="w-[150px] shrink-0"
            value={from}
            onChange={(e) => applyRange({ from: e.target.value, to })}
          />
          <span className="shrink-0 text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-[150px] shrink-0"
            value={to}
            onChange={(e) => applyRange({ from, to: e.target.value })}
          />
        </>
      ) : null}
    </div>
  );
}
