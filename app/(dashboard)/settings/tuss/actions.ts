"use server";

import { revalidatePath } from "next/cache";

import { requireActionPermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/server";
import { describeTussError, fetchTussListPage, type TussSyncRow, type TussTable } from "@/lib/tuss";

// Tempo máximo de um lote (a página tem maxDuration = 60s; sobra folga pra
// a última página do lote terminar).
const BATCH_BUDGET_MS = 15_000;

export type TussSyncResult = {
  ok: boolean;
  error?: string;
  /** Próxima página a buscar (quando `done` é false). */
  nextPage?: number;
  done?: boolean;
  /** Itens gravados neste lote. */
  saved?: number;
};

function isTable(value: string): value is TussTable {
  return value === "tuss-22" || value === "tuss-19";
}

/**
 * Baixa um lote (algumas páginas em paralelo) da tabela TUSS da ANS e grava
 * na cópia local. O cliente chama em sequência até `done`, mostrando o
 * progresso — cada chamada é curta pra caber no limite de tempo da Vercel.
 * Só grava depois que TODAS as páginas do lote chegaram, e o upsert é
 * idempotente: repetir o mesmo lote não duplica nada.
 */
export async function syncTussBatchAction(table: string, startPage: number): Promise<TussSyncResult> {
  try {
    await requireActionPermission("settings", "edit");
  } catch {
    return { ok: false, error: "Você não tem permissão para atualizar a tabela TUSS." };
  }
  if (!isTable(table) || !Number.isInteger(startPage) || startPage < 1) {
    return { ok: false, error: "Parâmetros inválidos." };
  }

  try {
    const admin = createAdminClient();
    const startedAt = Date.now();
    let page = startPage;
    let saved = 0;
    let done = false;

    // Uma página por vez (a ANS não gosta de várias em paralelo), gravando a
    // cada página — assim o que já chegou nunca se perde, mesmo se a próxima
    // der erro. Para quando acaba o orçamento de tempo do lote.
    while (!done && Date.now() - startedAt < BATCH_BUDGET_MS) {
      let rows: TussSyncRow[];
      try {
        rows = await fetchTussListPage(table, page);
      } catch {
        rows = await fetchTussListPage(table, page); // 1 nova tentativa
      }
      if (rows.length === 0) {
        done = true;
        break;
      }
      const byCode = new Map(rows.map((r) => [r.code, r]));
      const { error } = await admin
        .from("tuss_terms")
        .upsert(Array.from(byCode.values()), { onConflict: "table_name,code" });
      if (error) throw error;
      saved += byCode.size;
      page += 1;
    }

    const { error: stateError } = await admin.from("tuss_sync_state").upsert(
      {
        table_name: table,
        last_page: done ? 0 : page,
        status: done ? "done" : "running",
        ...(done ? { last_synced_at: new Date().toISOString() } : {}),
      },
      { onConflict: "table_name" }
    );
    if (stateError) throw stateError;

    if (done) revalidatePath("/settings/tuss");
    return { ok: true, nextPage: page, done, saved };
  } catch (e) {
    console.error("[tuss] falha na atualização:", e);
    const message = String((e as { message?: unknown } | null)?.message ?? "");
    if (message.includes("tuss_terms") || message.includes("tuss_sync_state")) {
      return {
        ok: false,
        error: "A tabela local ainda não existe no banco. Aplique a migration 0022 no Supabase.",
      };
    }
    return { ok: false, error: `Não foi possível atualizar agora (${describeTussError(e)}). Tente de novo.` };
  }
}
