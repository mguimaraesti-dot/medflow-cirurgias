"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2, CalendarRange, Stethoscope } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRESETS = [
  { value: "year", label: "Ano atual" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "custom", label: "Personalizado" },
];

/** Filtros globais do Dashboard (período, hospital, atendimento). Tudo vai na URL e a tela inteira respeita. */
export function DashboardFiltersBar({
  hospitals,
  preset,
  from,
  to,
}: {
  hospitals: { id: string; name: string }[];
  preset: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "" || v === "all") params.delete(k);
      else params.set(k, v);
    }
    start(() => router.replace(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <Select
        value={preset}
        onValueChange={(v) => (v === "custom" ? update({ p: "custom", from, to }) : update({ p: v === "year" ? null : v, from: null, to: null }))}
      >
        <SelectTrigger className="w-full sm:w-[170px]">
          <span className="flex min-w-0 items-center gap-2"><CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue /></span>
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("hospital") ?? "all"} onValueChange={(v) => update({ hospital: v })}>
        <SelectTrigger className="w-full sm:w-[190px]">
          <span className="flex min-w-0 items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue /></span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as unidades</SelectItem>
          {hospitals.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("att") ?? "all"} onValueChange={(v) => update({ att: v })}>
        <SelectTrigger className="w-full sm:w-[170px]">
          <span className="flex min-w-0 items-center gap-2"><Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" /><SelectValue /></span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Particular e Convênio</SelectItem>
          <SelectItem value="particular">Particular</SelectItem>
          <SelectItem value="convenio">Convênio</SelectItem>
        </SelectContent>
      </Select>

      {preset === "custom" ? (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input type="date" value={from} onChange={(e) => update({ p: "custom", from: e.target.value, to })} aria-label="Data inicial" className="sm:w-[150px]" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={to} onChange={(e) => update({ p: "custom", from, to: e.target.value })} aria-label="Data final" className="sm:w-[150px]" />
        </div>
      ) : null}
    </div>
  );
}
