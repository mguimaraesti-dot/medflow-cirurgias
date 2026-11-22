"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { Building2, CalendarClock, ShieldCheck, ArrowRight } from "lucide-react";

import type { SurgeryListItem, WorkflowStage } from "@/lib/data/surgeries";
import { moveSurgeryStageAction } from "@/app/(dashboard)/surgeries/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { getStageColor } from "@/components/kanban/stage-palette";
import { CopyAuthorizationRequestButton } from "@/components/surgeries/copy-authorization-request-button";
import {
  REQUIREMENT_ICON,
  REQUIREMENT_LABEL,
  REQUIREMENT_DESCRIPTION,
  REQUIREMENT_ORDER,
} from "@/components/kanban/requirement-meta";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<SurgeryListItem["priority"], string> = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VARIANT: Record<SurgeryListItem["priority"], "secondary" | "info" | "warning" | "destructive"> = {
  low: "secondary",
  normal: "info",
  high: "warning",
  urgent: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function daysSinceIndication(value: string): number {
  const start = new Date(value + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

export function SurgeryDetailSheet({
  surgery,
  stages,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  surgery: SurgeryListItem;
  stages: WorkflowStage[];
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const onOpenChange = onOpenChangeProp ?? setInternalOpen;
  const [stagePending, startStageTransition] = useTransition();

  const stageIndex = stages.findIndex((s) => s.id === surgery.stage_id);
  const nextStage = stageIndex >= 0 ? stages[stageIndex + 1] : undefined;

  const byKey = new Map(surgery.requirements.map((r) => [r.requirement_key, r]));
  const satisfiedCount = REQUIREMENT_ORDER.filter((key) => byKey.get(key)?.is_satisfied).length;
  const progressPct = Math.round((satisfiedCount / REQUIREMENT_ORDER.length) * 100);

  const date = surgery.confirmed_date ?? surgery.expected_date;
  const attendanceLabel =
    surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent>
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{surgery.code}</span>
            <Badge variant={PRIORITY_VARIANT[surgery.priority]}>{PRIORITY_LABEL[surgery.priority]}</Badge>
          </div>
          <SheetTitle>{surgery.patient?.full_name ?? "—"}</SheetTitle>
          <SheetDescription>
            {surgery.primary_procedure?.name ?? "—"}
            {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-3 w-3" /> Hospital
              </p>
              <p className="mt-0.5 text-foreground">{surgery.hospital?.name ?? "—"}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Convênio
              </p>
              <p className="mt-0.5 text-foreground">{attendanceLabel}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Data agendada
              </p>
              <p className="mt-0.5 text-foreground">{formatDate(date)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Idade da solicitação
              </p>
              <p className="mt-0.5 text-foreground">
                {daysSinceIndication(surgery.indication_date)} dia
                {daysSinceIndication(surgery.indication_date) === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fluxo da cirurgia
            </p>
            <div className="mt-2 flex flex-col">
              {stages.map((stage, index) => {
                const isCurrent = index === stageIndex;
                const isPast = stageIndex >= 0 && index < stageIndex;
                const color = getStageColor(index, stages.length);
                return (
                  <div key={stage.id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: isPast || isCurrent ? color : "var(--color-muted)" }}
                      >
                        {index + 1}
                      </span>
                      {index < stages.length - 1 ? (
                        <span className="my-0.5 h-4 w-px bg-border" />
                      ) : null}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-2 pb-2.5">
                      <span
                        className={cn(
                          "text-sm",
                          isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {stage.name}
                      </span>
                      {isCurrent ? <Badge variant="info">Atual</Badge> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pendências</p>
              <span className="text-xs text-muted-foreground">
                {satisfiedCount}/{REQUIREMENT_ORDER.length} · {progressPct}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {REQUIREMENT_ORDER.map((key) => {
                const req = byKey.get(key);
                const Icon = REQUIREMENT_ICON[key];
                const isSatisfied = req?.is_satisfied ?? false;
                const isWaived = req?.waived ?? false;
                return (
                  // Somente leitura: o status vem dos dados reais (autorização,
                  // reserva, pré-operatório). Para alterar, abre a ficha completa.
                  <Link
                    key={key}
                    href={`/surgeries/${surgery.id}`}
                    title="Abrir a ficha para registrar os dados"
                    className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-ring"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        isSatisfied
                          ? "border-transparent bg-emerald-500 text-white dark:bg-emerald-600"
                          : "border-border bg-transparent text-transparent"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isSatisfied ? "text-muted-foreground line-through" : "text-foreground"
                        )}
                      >
                        {REQUIREMENT_LABEL[key]}
                        {isWaived ? " (dispensado)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{REQUIREMENT_DESCRIPTION[key]}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row flex-wrap justify-between gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link href={`/surgeries/${surgery.id}`}>
              <Button type="button" variant="outline" size="sm">
                Ver completo
              </Button>
            </Link>
            <Link href={`/surgeries/${surgery.id}/edit`}>
              <Button type="button" variant="outline" size="sm">
                Editar
              </Button>
            </Link>
            <CopyAuthorizationRequestButton surgeryId={surgery.id} />
          </div>
          {nextStage ? (
            <Button
              type="button"
              size="sm"
              disabled={stagePending}
              onClick={() =>
                startStageTransition(() => moveSurgeryStageAction(surgery.id, nextStage.id))
              }
            >
              {stagePending ? "Avançando..." : `Avançar para ${nextStage.name}`}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
