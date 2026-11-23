import { Suspense, type ReactNode } from "react";
import { ExternalLink, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getAiCreditSettings, fetchAnthropicSpendUsd, type AiCreditSettings } from "@/lib/ai/credit";
import { isReaderConfigured } from "@/lib/ai/surgery-request-reader";
import { Card, CardContent } from "@/components/ui/card";
import { AiCreditForm } from "@/components/settings/ai-credit-form";
import { cn, todayInSaoPaulo } from "@/lib/utils";

const usd = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const fmtDate = (ymd: string) => new Date(ymd + "T00:00:00").toLocaleDateString("pt-BR");

function Shell({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-muted-foreground" /> Saldo da IA — leitura de guias
          </p>
          <a
            href="https://console.anthropic.com/settings/billing"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Abrir Billing no Console <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

async function Body({ canEdit }: { canEdit: boolean }) {
  if (!isReaderConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        A leitura de guias por IA não está configurada (falta <code>ANTHROPIC_API_KEY</code> no ambiente).
      </p>
    );
  }

  let settings: AiCreditSettings | null = null;
  try {
    settings = await getAiCreditSettings(await createClient());
  } catch {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-300">
        Falta aplicar a migração <code>0028_ai_credit_settings.sql</code> no Supabase para ativar o indicador.
      </p>
    );
  }

  const defaults = {
    credit_usd: settings?.credit_usd ?? null,
    credit_since: settings?.credit_since ?? todayInSaoPaulo(),
    low_balance_usd: settings?.low_balance_usd ?? 5,
  };

  if (!settings) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Informe quanto crédito foi comprado e quando. O sistema lê o gasto real na Anthropic e mostra o saldo restante.
        </p>
        {canEdit ? <AiCreditForm defaults={defaults} startOpen /> : null}
      </>
    );
  }

  const spend = await fetchAnthropicSpendUsd(settings.credit_since);

  if (spend.status !== "ok") {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Crédito informado: <span className="font-medium text-foreground">{usd(settings.credit_usd)}</span> em {fmtDate(settings.credit_since)}.
        </p>
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          {spend.status === "no_admin_key"
            ? "Para calcular o saldo, cadastre a variável ANTHROPIC_ADMIN_KEY (chave Admin da Anthropic) no ambiente do sistema. Ela só existe em contas de organização, criada em Console → Settings → Admin keys."
            : spend.message}
        </p>
        {canEdit ? <AiCreditForm defaults={defaults} startOpen={false} /> : null}
      </>
    );
  }

  const balance = settings.credit_usd - spend.spentUsd;
  const pct = settings.credit_usd > 0 ? Math.max(0, Math.min(100, (balance / settings.credit_usd) * 100)) : 0;
  const empty = balance <= 0;
  const low = !empty && balance <= settings.low_balance_usd;

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Saldo estimado</p>
          <p
            className={cn(
              "text-2xl font-semibold",
              empty ? "text-red-600 dark:text-red-400" : low ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {usd(Math.max(0, balance))}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>
            Crédito: <span className="text-foreground">{usd(settings.credit_usd)}</span> (desde {fmtDate(settings.credit_since)})
          </p>
          <p>
            Gasto: <span className="text-foreground">{usd(spend.spentUsd)}</span>
          </p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(pct)}% do crédito restante`}>
        <div className={cn("h-full rounded-full", empty ? "bg-red-500" : low ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </div>
      {empty ? (
        <p className="text-sm text-red-600 dark:text-red-400">Crédito esgotado: a leitura de guias vai falhar até uma nova recarga.</p>
      ) : low ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">Saldo baixo (abaixo de {usd(settings.low_balance_usd)}). Considere recarregar.</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Estimativa: crédito informado menos o gasto da conta na Anthropic, que pode levar alguns minutos para atualizar e inclui qualquer outro uso da mesma conta. O valor exato está no Console.
      </p>
      {canEdit ? <AiCreditForm defaults={defaults} startOpen={false} /> : null}
    </>
  );
}

export function AiCreditCard({ canEdit }: { canEdit: boolean }) {
  return (
    <Shell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Consultando a Anthropic…</p>}>
        <Body canEdit={canEdit} />
      </Suspense>
    </Shell>
  );
}
