"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { loadWhatsappScheduleAction, type WhatsappScheduleData } from "@/app/(dashboard)/reports/whatsapp-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildSurgerySchedule } from "@/lib/whatsapp/surgery-schedule";
import { cn } from "@/lib/utils";

const DOCTOR_GREETING = "Dr. Flávio Morita";

type Preset = 7 | 15 | 30 | "all" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: 7, label: "Próximos 7 dias" },
  { value: 15, label: "Próximos 15 dias" },
  { value: 30, label: "Próximos 30 dias" },
  { value: "all", label: "Todo o período" },
  { value: "custom", label: "Personalizado" },
];

/** Renderiza *negrito* do WhatsApp preservando quebras de linha. */
function WhatsappText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <div key={i} className="min-h-[1.1em] whitespace-pre-wrap break-words">
          {line.split(/(\*[^*\n]+\*)/g).map((part, j) =>
            part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <strong key={j}>{part.slice(1, -1)}</strong> : <span key={j}>{part}</span>
          )}
        </div>
      ))}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function WhatsappScheduleDialog() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>(30);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<WhatsappScheduleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [copied, setCopied] = useState(false);


  const load = useCallback(() => {
    startLoad(async () => {
      const res = await loadWhatsappScheduleAction({ preset, from, to });
      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        setError(null);
        setData(res.data ?? null);
      }
    });
  }, [preset, from, to]);

  useEffect(() => {
    if (!open) return;
    if (preset === "custom" && (!from || !to)) return;
    load();
  }, [open, preset, from, to, load]);

  const schedule = useMemo(
    () => (data ? buildSurgerySchedule({ doctorName: DOCTOR_GREETING, rows: data.rows }) : null),
    [data]
  );

  async function copy() {
    if (!schedule) return;
    try {
      await navigator.clipboard.writeText(schedule.text);
      setCopied(true);
      toast.success("Mensagem copiada.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a mensagem.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <MessageCircle className="h-4 w-4" />
          Enviar programação pelo WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programação cirúrgica pelo WhatsApp</DialogTitle>
          <DialogDescription>
            Revise a mensagem, copie e cole no WhatsApp. Nada é enviado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Período</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={String(p.value)}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs",
                      preset === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === "custom" ? (
                <div className="flex gap-2 pt-1">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" />
                </div>
              ) : null}
            </div>

            {schedule ? (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Total" value={schedule.total} />
                <Stat label="Particulares" value={schedule.byModality.particular} />
                <Stat label="Convênios" value={schedule.byModality.convenio} />
                <Stat label="Confirmadas" value={schedule.byStatus.confirmed} />
                <Stat label="Pendentes" value={schedule.byStatus.pending} />
                <Stat label="Em autorização" value={schedule.byStatus.authorization} />
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex gap-2">
                <Button type="button" className="flex-1" onClick={copy} disabled={!schedule || loading}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar mensagem"}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={load} disabled={loading || (preset === "custom" && (!from || !to))}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Atualizar
                </Button>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Pré-visualização</p>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-[#0b141a] p-3">
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : !schedule ? (
                <p className="text-sm text-slate-400">{preset === "custom" && (!from || !to) ? "Informe o período." : "Carregando programação..."}</p>
              ) : (
                <div className="ml-auto max-w-full rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 text-[13px] leading-snug text-[#e9edef] shadow">
                  <WhatsappText text={schedule.text} />
                </div>
              )}
            </div>
            {data ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {preset === "all" ? "Todo o período" : `Período ${data.from.split("-").reverse().join("/")} a ${data.to.split("-").reverse().join("/")}`}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
