"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Building2, CalendarClock, ShieldCheck, Clock3 } from "lucide-react";
import { toast } from "sonner";

import type { ScheduleSurgeryItem, SurgeryHistoryEntry } from "@/lib/data/surgeries";
import {
  setSurgeryScheduleAction,
  getSurgeryHistoryAction,
} from "@/app/(dashboard)/surgeries/actions";
import { deriveScheduleStatus, SCHEDULE_STATUS_COLOR, SCHEDULE_STATUS_LABEL } from "@/lib/schedule-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CancelSurgeryButton } from "@/components/surgeries/cancel-surgery-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatTime(value: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const ATTENDANCE_LABEL = (surgery: ScheduleSurgeryItem) =>
  surgery.attendance_type === "particular" ? "Particular" : surgery.insurance_provider?.name ?? "Convênio";

export function ScheduleDetailSheet({
  surgery,
  trigger,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  surgery: ScheduleSurgeryItem;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const onOpenChange = onOpenChangeProp ?? setInternalOpen;

  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(surgery.confirmed_date ?? surgery.expected_date ?? "");
  const [newTime, setNewTime] = useState(surgery.confirmed_time ?? "");
  const [pending, startTransition] = useTransition();

  const [history, setHistory] = useState<SurgeryHistoryEntry[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Recarrega sempre que o painel abre — reflete alterações feitas desde
    // a última vez que esse painel foi aberto (ex: avançou de etapa no
    // Mapa Cirúrgico enquanto isso).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara a busca do histórico ao abrir, não é estado derivável em render
    setHistoryLoading(true);
    getSurgeryHistoryAction(surgery.id)
      .then(setHistory)
      .finally(() => setHistoryLoading(false));
    // Reseta o formulário de remarcar ao reabrir o painel.
    setRescheduling(false);
    setNewDate(surgery.confirmed_date ?? surgery.expected_date ?? "");
    setNewTime(surgery.confirmed_time ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, surgery.id]);

  const scheduleStatus = deriveScheduleStatus(surgery);
  const color = SCHEDULE_STATUS_COLOR[scheduleStatus];
  const isClosed = surgery.status === "cancelled" || surgery.status === "completed";
  const canConfirm = !isClosed && !surgery.confirmed_date && !!surgery.expected_date;

  function saveSchedule(date: string, time: string) {
    if (!date) {
      toast.error("Escolha uma data.");
      return;
    }
    startTransition(async () => {
      try {
        await setSurgeryScheduleAction(surgery.id, date, time || null);
        toast.success("Agenda atualizada.");
        setRescheduling(false);
      } catch {
        toast.error("Não foi possível atualizar a agenda.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{surgery.patient?.full_name ?? "—"}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={color.badge}>
              <Clock3 className="h-3 w-3" />
              {SCHEDULE_STATUS_LABEL[scheduleStatus]}
            </Badge>
            <Badge variant="secondary">{ATTENDANCE_LABEL(surgery)}</Badge>
          </div>
          <SheetDescription className="sr-only">
            Resumo rápido da cirurgia {surgery.code}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Procedimento</p>
            <p className="mt-0.5 font-medium text-foreground">
              {surgery.primary_procedure?.name ?? "—"}
              {surgery.procedures.length > 1 ? ` +${surgery.procedures.length - 1}` : ""}
            </p>
          </div>

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
              <p className="mt-0.5 text-foreground">{ATTENDANCE_LABEL(surgery)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CalendarClock className="h-3 w-3" /> Data
              </p>
              <p className="mt-0.5 text-foreground">
                {formatDate(surgery.confirmed_date ?? surgery.expected_date)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Clock3 className="h-3 w-3" /> Horário
              </p>
              <p className="mt-0.5 text-foreground">{formatTime(surgery.confirmed_time) ?? "A definir"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Criada em</p>
              <p className="mt-0.5 text-foreground">{formatDateTime(surgery.created_at)}</p>
            </div>
          </div>

          {rescheduling ? (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-sm font-medium text-foreground">Nova data/horário</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="reschedule-date" className="text-xs">
                    Data
                  </Label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="reschedule-time" className="text-xs">
                    Horário
                  </Label>
                  <Input
                    id="reschedule-time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => saveSchedule(newDate, newTime)}
                >
                  {pending ? "Salvando..." : "Salvar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRescheduling(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {canConfirm ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => saveSchedule(surgery.expected_date!, surgery.confirmed_time ?? "")}
                >
                  Confirmar cirurgia
                </Button>
              ) : null}
              {!isClosed ? (
                <Button variant="outline" size="sm" onClick={() => setRescheduling(true)}>
                  Remarcar
                </Button>
              ) : null}
              <Link href={`/surgeries/${surgery.id}/edit`}>
                <Button variant="outline" size="sm">
                  Editar
                </Button>
              </Link>
              {!isClosed ? <CancelSurgeryButton surgeryId={surgery.id} /> : null}
            </div>
          )}

          <Link
            href={`/surgeries/${surgery.id}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Ver ficha completa →
          </Link>

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Histórico de alterações
            </p>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
            ) : (
              <ol className="flex flex-col gap-2.5 border-l border-border pl-4">
                {history.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-foreground">{entry.description}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                    </div>
                    {entry.changedByName ? (
                      <p className="text-xs text-muted-foreground">Por {entry.changedByName}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
