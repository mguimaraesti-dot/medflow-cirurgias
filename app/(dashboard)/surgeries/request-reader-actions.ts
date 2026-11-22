"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { analyzeExtraction } from "@/lib/data/surgery-request-match";
import { isAllowedMedia, isReaderConfigured, readSurgeryRequest } from "@/lib/ai/surgery-request-reader";
import type { RequestAnalysis } from "@/lib/surgery-request-types";

const MAX_BYTES = 5 * 1024 * 1024;

/** A leitura por IA está configurada (chave da API presente no servidor)? */
export async function isRequestReaderAvailableAction(): Promise<boolean> {
  return isReaderConfigured();
}

/**
 * Lê a foto de um pedido/guia e devolve SUGESTÕES (nada é gravado aqui).
 * Quem confirma e salva é o usuário, na tela de revisão.
 */
export async function analyzeSurgeryRequestAction(
  formData: FormData
): Promise<{ analysis?: RequestAnalysis; error?: string }> {
  try {
    await requireActionPermission("surgeries", "edit");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  if (!isReaderConfigured()) {
    return { error: "A leitura de pedidos por IA ainda não foi configurada (chave da API ausente no servidor)." };
  }

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione a foto do pedido." };
  if (!isAllowedMedia(file.type)) return { error: "Use uma imagem JPG, PNG ou WebP." };
  if (file.size > MAX_BYTES) return { error: "Imagem grande demais (máx. 5 MB)." };

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extraction = await readSurgeryRequest(base64, file.type);
    if (extraction.procedures.length === 0 && !extraction.patient_name && extraction.materials.length === 0) {
      return { error: "Não consegui ler dados nessa imagem. Tente uma foto mais nítida, de frente e bem iluminada." };
    }
    const supabase = await createClient();
    const analysis = await analyzeExtraction(supabase, extraction);
    return { analysis };
  } catch (e) {
    console.error("[reader] falha:", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("reader_api_401") || msg.startsWith("reader_api_403")) {
      return { error: "A chave da API de IA foi recusada. Verifique a configuração no servidor." };
    }
    if (msg.startsWith("reader_api_429")) return { error: "Limite de uso da IA atingido. Tente novamente em instantes." };
    return { error: "Não foi possível ler a imagem agora. Tente novamente." };
  }
}
