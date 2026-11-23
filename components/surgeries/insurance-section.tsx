"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileImage, FileText, HeartHandshake, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  getDocumentUrlAction,
  listInsuranceCardsAction,
} from "@/app/(dashboard)/surgeries/patients/documents-actions";
import { uploadPatientDocument } from "@/lib/patient-documents-client";
import { ACCEPT_ATTRIBUTE } from "@/lib/patient-documents";
import { cn, todayInSaoPaulo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type InsuranceValues = {
  providerId: string;
  plan: string;
  cardNumber: string;
  cardValidity: string;
  accommodation: string;
  updatePatient: boolean;
};

type Card = { id: string; file_name: string; created_at: string; mime_type: string };

const NEAR_DAYS = 30;

export function cardValidityState(validity: string): { tone: "none" | "ok" | "near" | "expired"; label: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validity)) return { tone: "none", label: "Validade não informada" };
  const today = todayInSaoPaulo();
  if (validity < today) return { tone: "expired", label: "Carteirinha vencida" };
  const days = Math.round((new Date(validity + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
  if (days <= NEAR_DAYS) return { tone: "near", label: days === 0 ? "Vence hoje" : `Vence em ${days} dia(s)` };
  return { tone: "ok", label: "Carteirinha válida" };
}

const TONE_CLS = {
  none: "bg-muted text-muted-foreground",
  ok: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  near: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  expired: "bg-red-500/15 text-red-600 dark:text-red-400",
} as const;

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/**
 * "Dados do convênio": operadora, plano, carteirinha (nº + validade própria,
 * independente da validade da autorização), acomodação e anexos
 * (frente/verso). Os dados ficam no cadastro do paciente para reutilização;
 * os arquivos usam os documentos do paciente (categoria carteirinha), que
 * preservam o histórico de envios.
 */
export function InsuranceSection({
  patientId,
  providers,
  values,
  onChange,
  providerError,
  recovered,
  patientWithoutInsurance,
  canUploadCards,
}: {
  patientId: string;
  providers: { id: string; name: string }[];
  values: InsuranceValues;
  onChange: (patch: Partial<InsuranceValues>) => void;
  providerError?: string;
  /** Os dados foram recuperados do cadastro do paciente. */
  recovered: boolean;
  /** O cadastro do paciente ainda não tem convênio. */
  patientWithoutInsurance: boolean;
  canUploadCards: boolean;
}) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<"frente" | "verso" | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const validity = cardValidityState(values.cardValidity);

  const load = useCallback(async () => {
    if (!patientId) return;
    const res = await listInsuranceCardsAction(patientId);
    if ("error" in res) {
      setCards([]);
      setCardsError(res.error);
    } else {
      setCards(res.cards);
      setCardsError(null);
    }
  }, [patientId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCards(null);
    if (patientId) void load();
  }, [patientId, load]);

  async function upload(side: "frente" | "verso", file: File | undefined) {
    if (!file || !patientId) return;
    setUploading(side);
    const named = new File([file], `carteirinha-${side}-${file.name}`, { type: file.type });
    const err = await uploadPatientDocument(patientId, named, "insurance_card");
    setUploading(null);
    if (err) toast.error(err);
    else {
      toast.success(`Carteirinha (${side}) anexada. Os envios anteriores foram mantidos no histórico.`);
      await load();
    }
  }

  async function open(id: string) {
    const tab = window.open("", "_blank");
    const res = await getDocumentUrlAction(id, "view");
    if ("error" in res) {
      tab?.close();
      toast.error(res.error);
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = res.url;
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Dados do convênio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><HeartHandshake className="h-4 w-4" /></span>
          Dados do convênio
        </h2>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", TONE_CLS[validity.tone])}>
          {validity.tone === "expired" || validity.tone === "near" ? <AlertTriangle className="h-3 w-3" /> : validity.tone === "ok" ? <CheckCircle2 className="h-3 w-3" /> : null}
          {validity.label}
        </span>
      </div>

      {patientWithoutInsurance ? (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Este paciente ainda não tem convênio no cadastro. Preencha abaixo e mantenha marcado “Salvar no cadastro do paciente” para reutilizar nas próximas cirurgias.
        </p>
      ) : recovered ? (
        <p className="mt-2 text-xs text-muted-foreground">Dados recuperados do cadastro do paciente. Altere o que for necessário.</p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_provider_id" className="text-xs text-muted-foreground">Operadora *</Label>
          <Select name="insurance_provider_id" value={values.providerId} onValueChange={(v) => onChange({ providerId: v })}>
            <SelectTrigger id="insurance_provider_id" className="h-10" aria-invalid={!!providerError || undefined}>
              <SelectValue placeholder="Selecione a operadora" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {providerError ? <p className="text-xs text-red-600 dark:text-red-400" role="alert">{providerError}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_plan" className="text-xs text-muted-foreground">Plano / categoria</Label>
          <Input id="insurance_plan" name="insurance_plan" className="h-10" maxLength={120} value={values.plan} onChange={(e) => onChange({ plan: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_accommodation" className="text-xs text-muted-foreground">Acomodação</Label>
          <Input id="insurance_accommodation" name="insurance_accommodation" className="h-10" maxLength={120} list="accommodation-options" placeholder="Quando aplicável" value={values.accommodation} onChange={(e) => onChange({ accommodation: e.target.value })} />
          <datalist id="accommodation-options"><option value="Apartamento" /><option value="Enfermaria" /></datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_card_number" className="text-xs text-muted-foreground">Nº da carteirinha</Label>
          <Input id="insurance_card_number" name="insurance_card_number" className="h-10" maxLength={60} value={values.cardNumber} onChange={(e) => onChange({ cardNumber: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insurance_card_validity" className="text-xs text-muted-foreground">Validade da carteirinha</Label>
          <Input id="insurance_card_validity" name="insurance_card_validity" type="date" className="h-10" value={values.cardValidity} onChange={(e) => onChange({ cardValidity: e.target.value })} />
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" className="mt-0.5" checked={values.updatePatient} onChange={(e) => onChange({ updatePatient: e.target.checked })} />
        <span>Salvar/atualizar estes dados no cadastro do paciente (reutilizados nas próximas cirurgias).</span>
      </label>
      <input type="hidden" name="patient_insurance_update" value={values.updatePatient ? "1" : "0"} />

      <div className="mt-4 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Carteirinha (imagem ou PDF)</p>
          {canUploadCards && patientId ? (
            <div className="flex gap-2">
              {(["frente", "verso"] as const).map((side) => (
                <span key={side}>
                  <input
                    ref={side === "frente" ? frontRef : backRef}
                    type="file"
                    accept={ACCEPT_ATTRIBUTE}
                    className="hidden"
                    onChange={(e) => { void upload(side, e.target.files?.[0]); e.target.value = ""; }}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8" disabled={uploading !== null} onClick={() => (side === "frente" ? frontRef : backRef).current?.click()}>
                    {uploading === side ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
                    {side === "frente" ? "Anexar frente" : "Anexar verso"}
                  </Button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {!patientId ? (
          <p className="mt-2 text-xs text-muted-foreground">Selecione o paciente para anexar ou consultar a carteirinha.</p>
        ) : cards === null ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando…</p>
        ) : cardsError ? (
          <p className="mt-2 text-xs text-muted-foreground">{cardsError}</p>
        ) : cards.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Nenhuma carteirinha anexada. Novos envios não apagam os anteriores.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {cards.map((c, i) => {
              const Icon = c.mime_type === "application/pdf" ? FileText : FileImage;
              return (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.file_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(c.created_at)}</span>
                    {i === 0 ? <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">mais recente</span> : <span className="shrink-0 text-[10px] text-muted-foreground">histórico</span>}
                  </span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => void open(c.id)}>
                    <ExternalLink className="h-3.5 w-3.5" />Abrir
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
