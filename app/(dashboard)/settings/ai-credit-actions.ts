"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";

export type AiCreditFormState = { error?: string; ok?: boolean };

function parseMoney(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number(value.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? Math.round(n * 100) / 100 : null;
}

/** Registra a recarga (crédito em US$ e data) e o limite de aviso de saldo baixo. */
export async function saveAiCreditSettingsAction(
  _prev: AiCreditFormState,
  formData: FormData
): Promise<AiCreditFormState> {
  try {
    await requireActionPermission("settings", "edit");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const credit = parseMoney(formData.get("credit_usd"));
  const low = parseMoney(formData.get("low_balance_usd"));
  const since = String(formData.get("credit_since") ?? "");
  if (credit == null) return { error: "Informe o crédito em dólares (ex.: 20,00)." };
  if (low == null) return { error: "Informe o valor de aviso de saldo baixo (ex.: 5,00)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return { error: "Informe a data da recarga." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_credit_settings").upsert(
      { id: true, credit_usd: credit, credit_since: since, low_balance_usd: low, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    if (error) throw error;
  } catch (e) {
    console.error("[ai-credit] salvar:", e);
    return { error: "Não foi possível salvar. Verifique se a migração 0028 foi aplicada." };
  }
  revalidatePath("/settings");
  return { ok: true };
}
