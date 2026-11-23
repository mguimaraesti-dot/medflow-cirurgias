"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarDays, ChevronDown, ExternalLink, ListTodo, Package, Plus, SlidersHorizontal, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { moveSurgeryStageAction } from "@/app/(dashboard)/surgeries/actions";
import { ClearFiltersButton, MapFilters } from "@/components/kanban/map-filters";
import { RequirementBadges } from "@/components/kanban/requirement-badges";
import { getStageColor } from "@/components/kanban/stage-palette";
import { SearchInput } from "@/components/shared/search-input";
import { SurgeryProgressBar, type ProgressStep } from "@/components/surgeries/surgery-progress-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MapStats, SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { computeSurgeryProgressSteps } from "@/lib/surgery-progress";
import { cn } from "@/lib/utils";

/** Rótulos curtos por etapa (cabem em telas de 360px). */
const SHORT_LABEL: Record<string, string> = {
  new_indication: "Recebida",
  authorization: "Autoriz.",
  or_reservation: "Agenda",
  preoperative: "Pré-op.",
  released: "Liberada",
  completed: "Realizada",
};
const STATUS_CHIP: Record<string, string> = {
  new_indication: "Recebida",
  authorization: "Aguardando autorização",
  or_reservation: "Agendamento",
  preoperative: "Pré-operatório",
  released: "Liberada",
  completed: "Realizada",
};
const NON_ACTIVE_LABEL: Record<string, string> = {
  rescheduled: "Reagendada",
  cancelled: "Cancelada",
  completed: "Realizada",
};
const PRIORITY_LABEL: Record<string, string> = { high: "Alta", urgent: "Urgente" };

const STAT_ITEMS: { key: keyof MapStats; label: string; href: string; tone: string }[] = [
  { key: "inProgress", label: "Em andamento", href: "?status=active", tone: "text-blue-400" },
  { key: "awaitingAuthorization", label: "Aguard. autorização", href: "?status=active&pending=authorization", tone: "text-amber-400" },
  { key: "scheduled", label: "Agendadas", href: "?status=active&scheduled=1", tone: "text-violet-400" },
  { key: "overdue", label: "Atrasadas", href: "?status=active&overdue=1", tone: "text-red-400" },
  { key: "completed", label: "Realizadas", href: "?view=lista&status=completed", tone: "text-emerald-400" },
];

function fmtDate(v: string | null) {
  if (!v) return null;
  const [y, m, d] = v.split("-");
  return d && m && y ? `${d}/${m}/${y}` : v;
}

function dateInfo(s: SurgeryListItem): { label: string; value: string } {
  if (s.status === "completed") return { label: "Realização", value: fmtDate(s.confirmed_date ?? s.expected_date) ?? "—" };
  if (s.confirmed_date) return { label: "Confirmada", value: fmtDate(s.confirmed_date)! };
  if (s.expected_date) return { label: "Prevista", value: fmtDate(s.expected_date)! };
  return { label: "Solicitação", value: fmtDate(s.indication_date) ?? "—" };
}

function MobileCard({
  surgery,
  stages,
  materials,
  openTasks,
}: {
  surgery: SurgeryListItem;
  stages: WorkflowStage[];
  materials: string[];
  openTasks: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const stageIndex = Math.max(0, stages.findIndex((s) => s.id === surgery.stage_id));
  const stage = stages[stageIndex];
  const color = getStageColor(stageIndex, stages.length);
  const concluded = surgery.status === "completed" || stage?.code === "completed";
  const chip = surgery.status !== "active" ? (NON_ACTIVE_LABEL[surgery.status] ?? surgery.status) : (STATUS_CHIP[stage?.code ?? ""] ?? stage?.name ?? "—");
  const chipColor = surgery.status === "cancelled" ? "#EF4444" : surgery.status === "rescheduled" ? "#F59E0B" : color;
  const date = dateInfo(surgery);
  const attendance = surgery.attendance_type === "particular" ? "Particular" : (surgery.insurance_provider?.name ? `Convênio - ${surgery.insurance_provider.name}` : "Convênio");
  const steps: ProgressStep[] = useMemo(
    () =>
      computeSurgeryProgressSteps(stages, { stage_id: surgery.stage_id, status: surgery.status }).map((st, i) => ({
        ...st,
        label: SHORT_LABEL[stages[i]?.code ?? ""] ?? st.label,
      })),
    [stages, surgery.stage_id, surgery.status]
  );
  const extraProcedures = surgery.procedures.length - 1;

  function move(stageId: string) {
    if (stageId === surgery.stage_id) return;
    start(async () => {
      try {
        await moveSurgeryStageAction(surgery.id, stageId);
        router.refresh();
        toast.success("Etapa atualizada.");
      } catch {
        toast.error("Não foi possível mover a cirurgia.");
      }
    });
  }

  return (
    <li className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" style={{ borderLeft: `4px solid ${chipColor}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="block w-full px-3 py-2.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{surgery.code}</span>
            {PRIORITY_LABEL[surgery.priority] ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", surgery.priority === "urgent" ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400")}>
                {PRIORITY_LABEL[surgery.priority]}
              </span>
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ backgroundColor: chipColor }}>
              {chip}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </span>
        </div>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("truncate text-[15px] font-semibold text-foreground", concluded && "text-muted-foreground line-through decoration-2")}>
              {surgery.patient?.full_name ?? "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{attendance}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 text-xs font-medium text-foreground">
              <CalendarDays className="h-3 w-3 text-muted-foreground" />
              {date.value}
            </p>
            <p className="text-[10px] text-muted-foreground">{date.label}</p>
          </div>
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <Building2 className="h-3 w-3 shrink-0" />
          {surgery.hospital?.name ?? "Hospital não informado"}
        </p>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border px-3 pb-3 pt-3">
          <div className="flex gap-2.5">
            <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Procedimento principal</p>
              <p className="text-sm text-muted-foreground">{surgery.primary_procedure?.name ?? "—"}</p>
              {extraProcedures > 0 ? <p className="text-xs text-muted-foreground">+{extraProcedures} procedimento{extraProcedures === 1 ? "" : "s"} adicional{extraProcedures === 1 ? "" : "is"}</p> : null}
            </div>
          </div>
          <div className="flex gap-2.5 border-t border-border pt-3">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Materiais ({materials.length})</p>
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum material.</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {materials.slice(0, 3).map((m, i) => (
                    <span key={`${m}-${i}`} className="max-w-[10rem] truncate rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-foreground">{m}</span>
                  ))}
                  {materials.length > 3 ? <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{materials.length - 3}</span> : null}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border pt-3">
            <SurgeryProgressBar steps={steps} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <RequirementBadges requirements={surgery.requirements} />
            {openTasks > 0 ? (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <ListTodo className="h-3 w-3" />
                {openTasks} tarefa{openTasks === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {surgery.status === "active" ? (
              <Select value={surgery.stage_id} onValueChange={move} disabled={pending}>
                <SelectTrigger className="min-w-0 flex-1 text-xs" aria-label="Mover para etapa">
                  <SelectValue placeholder="Mover para etapa" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Link href={`/surgeries/${surgery.id}`} className="shrink-0">
              <Button size="sm">
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function MobileSurgeryMap({
  stats,
  stages,
  surgeries,
  materialsBySurgery,
  openTasksBySurgery,
  procedures,
  hospitals,
  insuranceProviders,
}: {
  stats: MapStats;
  stages: WorkflowStage[];
  surgeries: SurgeryListItem[];
  materialsBySurgery: Record<string, string[]>;
  openTasksBySurgery: Record<string, number>;
  procedures: { id: string; name: string }[];
  hospitals: { id: string; name: string }[];
  insuranceProviders: { id: string; name: string }[];
}) {
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const activeCount = ["procedure", "hospital", "attendance", "priority", "status", "from", "overdue", "pending", "scheduled"].filter((k) => searchParams.get(k)).length;

  const stageIndex = new Map(stages.map((s, i) => [s.id, i]));
  const sorted = useMemo(
    () =>
      [...surgeries].sort(
        (a, b) => (stageIndex.get(a.stage_id) ?? 0) - (stageIndex.get(b.stage_id) ?? 0) || a.board_position - b.board_position
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [surgeries, stages]
  );
  const counts = new Map<string, number>();
  for (const s of surgeries) counts.set(s.stage_id, (counts.get(s.stage_id) ?? 0) + 1);
  const visible = stageFilter === "all" ? sorted : sorted.filter((s) => s.stage_id === stageFilter);

  const groups: { stage: WorkflowStage; index: number; items: SurgeryListItem[] }[] = [];
  for (const s of visible) {
    const idx = stageIndex.get(s.stage_id) ?? 0;
    const last = groups[groups.length - 1];
    if (last && last.stage.id === s.stage_id) last.items.push(s);
    else groups.push({ stage: stages[idx], index: idx, items: [s] });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight text-foreground">Mapa Cirúrgico</h1>
          <p className="truncate text-xs text-muted-foreground">Acompanhe o fluxo das cirurgias</p>
        </div>
        <Link href="/surgeries/new" className="shrink-0">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova cirurgia
          </Button>
        </Link>
      </div>

      {/* Indicadores em uma única faixa rolável: ~44px em vez de 5 cards. */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {STAT_ITEMS.map(({ key, label, href, tone }) => {
          const inner = (
            <>
              <span className={cn("text-base font-semibold", tone)}>{stats[key]}</span>
              <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>
            </>
          );
          const cls = "flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5";
          return stats[key] > 0 ? (
            <Link key={key} href={href} className={cls}>{inner}</Link>
          ) : (
            <div key={key} className={cn(cls, "opacity-60")}>{inner}</div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <SearchInput placeholder="Buscar por paciente, código..." className="min-w-0 flex-1 max-w-none" />
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-label="Filtros"
          aria-expanded={filtersOpen}
          className={cn("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-input-background text-foreground", filtersOpen && "border-primary text-primary")}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{activeCount}</span> : null}
        </button>
      </div>
      {filtersOpen ? (
        <div className="mt-2 rounded-xl border border-border bg-card p-3">
          <MapFilters procedures={procedures} hospitals={hospitals} insuranceProviders={insuranceProviders} hideSearch forceExpanded />
          <div className="mt-2 flex justify-end"><ClearFiltersButton /></div>
        </div>
      ) : null}

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {[{ id: "all", name: "Todas", count: surgeries.length, color: "" }, ...stages.map((s, i) => ({ id: s.id, name: SHORT_LABEL[s.code] ?? s.name, count: counts.get(s.id) ?? 0, color: getStageColor(i, stages.length) }))].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStageFilter(c.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
              stageFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground",
              c.id !== "all" && c.count === 0 && stageFilter !== c.id && "opacity-50"
            )}
          >
            {c.color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} /> : null}
            {c.name}
            <span className="font-semibold">{c.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Nenhuma cirurgia para esse filtro.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {groups.map((g) => (
            <section key={g.stage.id}>
              {stageFilter === "all" ? (
                <h2 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getStageColor(g.index, stages.length) }} />
                  {g.stage.name}
                  <span className="rounded-full bg-muted px-1.5 text-[10px]">{g.items.length}</span>
                </h2>
              ) : null}
              <ul className="space-y-2">
                {g.items.map((s) => (
                  <MobileCard key={s.id} surgery={s} stages={stages} materials={materialsBySurgery[s.id] ?? []} openTasks={openTasksBySurgery[s.id] ?? 0} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
