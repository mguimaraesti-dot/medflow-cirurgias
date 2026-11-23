"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
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

/** Logotipo oficial do WhatsApp (marca em verde). */
function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

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
          <WhatsappIcon className="h-4 w-4 text-[#25D366]" />
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
