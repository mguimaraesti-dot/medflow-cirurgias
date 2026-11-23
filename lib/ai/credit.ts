import type { SupabaseClient } from "@supabase/supabase-js";

export type AiCreditSettings = {
  credit_usd: number;
  credit_since: string; // AAAA-MM-DD
  low_balance_usd: number;
  updated_at: string;
};

/** Configuração salva; null = ainda não informada. Lança se a tabela não existir (migração 0028 pendente). */
export async function getAiCreditSettings(supabase: SupabaseClient): Promise<AiCreditSettings | null> {
  const { data, error } = await supabase
    .from("ai_credit_settings")
    .select("credit_usd,credit_since,low_balance_usd,updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    credit_usd: Number(data.credit_usd),
    credit_since: data.credit_since as string,
    low_balance_usd: Number(data.low_balance_usd),
    updated_at: data.updated_at as string,
  };
}

export type AiSpendResult =
  | { status: "ok"; spentUsd: number; fetchedAt: string }
  | { status: "no_admin_key" }
  | { status: "error"; message: string };

type CostReportPage = {
  data?: { results?: { amount?: string | number; currency?: string }[] }[];
  has_more?: boolean;
  next_page?: string | null;
};

/**
 * Gasto real (USD) da organização na Anthropic desde `sinceYmd`, pelo relatório
 * de custos da Admin API. Exige ANTHROPIC_ADMIN_KEY (chave "sk-ant-admin…",
 * criada no Console por um administrador de organização). Os valores vêm em
 * centavos de dólar, como texto decimal.
 *
 * Observação: é o gasto da organização/workspace da chave, não só desta
 * aplicação — se a mesma conta for usada em outros sistemas, eles entram na soma.
 */
export async function fetchAnthropicSpendUsd(sinceYmd: string): Promise<AiSpendResult> {
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY;
  if (!adminKey) return { status: "no_admin_key" };

  let cents = 0;
  let page: string | null | undefined;
  try {
    for (let i = 0; i < 20; i++) {
      const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
      url.searchParams.set("starting_at", `${sinceYmd}T00:00:00Z`);
      url.searchParams.set("ending_at", new Date().toISOString());
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.set("limit", "31");
      if (page) url.searchParams.set("page", page);

      const res = await fetch(url, {
        headers: { "x-api-key": adminKey, "anthropic-version": "2023-06-01", "User-Agent": "MedflowCirurgias/1.0" },
        next: { revalidate: 300 },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { status: "error", message: "A chave Admin foi recusada pela Anthropic. Confira se é uma chave sk-ant-admin… válida." };
        }
        return { status: "error", message: `A Anthropic respondeu com erro ${res.status}.` };
      }
      const body = (await res.json()) as CostReportPage;
      for (const bucket of body.data ?? []) {
        for (const r of bucket.results ?? []) {
          const n = Number(r.amount);
          if (Number.isFinite(n)) cents += n;
        }
      }
      if (!body.has_more || !body.next_page) break;
      page = body.next_page;
    }
  } catch (e) {
    console.error("[ai-credit] custo:", e);
    return { status: "error", message: "Não foi possível consultar a Anthropic agora." };
  }
  return { status: "ok", spentUsd: cents / 100, fetchedAt: new Date().toISOString() };
}
