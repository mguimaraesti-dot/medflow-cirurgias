"use server";

import { revalidatePath } from "next/cache";

import { requireActionPermission } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/server";
import { describeTussError, fetchTussListPage, type TussSyncRow, type TussTable } from "@/lib/tuss";

const PAGES_PER_BATCH = 4;
const UPSERT_CHUNK = 500;

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
    const pageNumbers = Array.from({ length: PAGES_PER_BATCH }, (_, i) => startPage + i);
    const pages = await Promise.all(pageNumbers.map((n) => fetchTussListPage(table, n)));
    const done = pages.some((rows) => rows.length === 0);

    const byCode = new Map<string, TussSyncRow>();
    for (const rows of pages) for (const row of rows) byCode.set(row.code, row);
    const all = Array.from(byCode.values());

    const admin = createAdminClient();
    for (let i = 0; i < all.length; i += UPSERT_CHUNK) {
      const { error } = await admin
        .from("tuss_terms")
        .upsert(all.slice(i, i + UPSERT_CHUNK), { onConflict: "table_name,code" });
      if (error) throw error;
    }

    const nextPage = startPage + PAGES_PER_BATCH;
    const { error: stateError } = await admin.from("tuss_sync_state").upsert(
      {
        table_name: table,
        last_page: done ? 0 : nextPage,
        status: done ? "done" : "running",
        ...(done ? { last_synced_at: new Date().toISOString() } : {}),
      },
      { onConflict: "table_name" }
    );
    if (stateError) throw stateError;

    if (done) revalidatePath("/settings/tuss");
    return { ok: true, nextPage, done, saved: all.length };
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
