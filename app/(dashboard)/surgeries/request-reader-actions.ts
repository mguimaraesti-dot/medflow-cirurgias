"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { analyzeExtraction } from "@/lib/data/surgery-request-match";
import { isAllowedMedia, isReaderConfigured, readSurgeryRequest } from "@/lib/ai/surgery-request-reader";
import { createProcedure } from "@/lib/data/procedures";
import { createMaterial } from "@/lib/data/materials";
import { procedureSchema } from "@/lib/validation/procedures";
import { materialSchema } from "@/lib/validation/materials";
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
    if (/credit balance/i.test(msg)) {
      return { error: "A conta da API de IA está sem crédito. Adicione crédito em console.anthropic.com → Billing." };
    }
    if (msg.startsWith("reader_api_")) {
      // Motivo devolvido pela API (não contém segredos) para facilitar o diagnóstico.
      return { error: `A IA recusou a leitura (${msg.slice("reader_api_".length)}).` };
    }
    if (e instanceof Error && e.name === "TimeoutError") {
      return { error: "A leitura demorou demais. Tente novamente com uma foto menor." };
    }
    return { error: "Não foi possível ler a imagem agora. Tente novamente." };
  }
}

// ----------------------------------------------------------------------------
// Cadastro rápido, a partir da tela de revisão, do que ainda não está no catálogo
// ----------------------------------------------------------------------------

export type QuickCreateResult = { item?: { id: string; name: string; tuss_code: string | null }; error?: string };

/**
 * Cadastra no catálogo um procedimento lido da guia. O nome vem da TUSS 22
 * (descrição oficial do código) quando o código existe; senão, da descrição lida.
 * Se já houver procedimento com esse código TUSS, devolve o existente.
 */
export async function createProcedureFromRequestAction(input: {
  code: string | null;
  description: string;
}): Promise<QuickCreateResult> {
  try {
    await requireActionPermission("surgeries", "edit");
    await requireActionPermission("procedures", "edit");
  } catch {
    return { error: "Você não tem permissão para cadastrar procedimentos." };
  }
  const code = input.code && /^\d{8}$/.test(input.code) ? input.code : null;
  const supabase = await createClient();
  try {
    if (code) {
      const { data: existing } = await supabase
        .from("procedures")
        .select("id,name,tuss_code")
        .eq("tuss_code", code)
        .limit(1)
        .maybeSingle();
      if (existing) return { item: existing as { id: string; name: string; tuss_code: string | null } };
    }
    let name = input.description.trim();
    if (code) {
      const { data: official } = await supabase
        .from("tuss_terms")
        .select("name")
        .eq("table_name", "tuss-22")
        .eq("code", code)
        .maybeSingle();
      if (official?.name) name = official.name as string;
    }
    if (!name) return { error: "Sem nome para cadastrar este procedimento." };

    const parsed = procedureSchema.safeParse({ name, tuss_code: code ?? "", active: "on" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const created = await createProcedure(supabase, parsed.data);
    revalidatePath("/catalog/procedures");
    return { item: { id: created.id, name, tuss_code: code } };
  } catch (e) {
    console.error("[reader] cadastro de procedimento:", e);
    return { error: "Não foi possível cadastrar o procedimento." };
  }
}

/** Cadastra no catálogo um material lido da guia (nome + marca/medidas escritos). */
export async function createMaterialFromRequestAction(input: {
  name: string;
  details: string | null;
}): Promise<QuickCreateResult> {
  try {
    await requireActionPermission("surgeries", "edit");
    await requireActionPermission("materials", "edit");
  } catch {
    return { error: "Você não tem permissão para cadastrar materiais." };
  }
  const name = [input.name.trim(), input.details?.trim()].filter(Boolean).join(" ");
  if (!name) return { error: "Sem nome para cadastrar este material." };
  const supabase = await createClient();
  try {
    const { data: existing } = await supabase
      .from("materials_catalog")
      .select("id,name")
      .ilike("name", name.replace(/[%_\\]/g, (c) => `\\${c}`))
      .limit(1)
      .maybeSingle();
    if (existing) return { item: { ...(existing as { id: string; name: string }), tuss_code: null } };

    const parsed = materialSchema.safeParse({ name, active: "on" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const created = await createMaterial(supabase, parsed.data);
    revalidatePath("/catalog/materials");
    return { item: { id: created.id, name: created.name, tuss_code: null } };
  } catch (e) {
    console.error("[reader] cadastro de material:", e);
    return { error: "Não foi possível cadastrar o material." };
  }
}
