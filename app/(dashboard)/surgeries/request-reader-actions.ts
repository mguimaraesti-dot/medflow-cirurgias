"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { analyzeExtraction } from "@/lib/data/surgery-request-match";
import {
  isAllowedMedia,
  isReaderConfigured,
  readSurgeryRequest,
  sanitizeExtraction,
} from "@/lib/ai/surgery-request-reader";
import { listCompositionsForProcedures, previewComposition } from "@/lib/data/compositions";
import { createProcedure } from "@/lib/data/procedures";
import { addMaterialSupplier, createMaterial } from "@/lib/data/materials";
import { fetchAll, normalizeText } from "@/lib/data/fetch-all";
import { procedureSchema } from "@/lib/validation/procedures";
import { materialSchema } from "@/lib/validation/materials";
import { createPatient } from "@/lib/data/patients";
import type { RequestAnalysis, RequestExtraction } from "@/lib/surgery-request-types";

const MAX_BYTES = 5 * 1024 * 1024;

/** A leitura por IA está configurada (chave da API presente no servidor)? */
export async function isRequestReaderAvailableAction(): Promise<boolean> {
  return isReaderConfigured();
}

/**
 * FASE 1 — lê a foto do pedido e devolve o que a IA transcreveu, para o usuário
 * validar/corrigir. Nada é gravado e nada é buscado no catálogo ainda.
 */
export async function readSurgeryRequestPhotoAction(
  formData: FormData
): Promise<{ extraction?: RequestExtraction; error?: string }> {
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
    return { extraction };
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

/**
 * FASE 2 — com os dados JÁ VALIDADOS pelo usuário, procura o paciente, os
 * procedimentos (conferindo o código na TUSS) e os materiais no cadastro.
 * Não usa IA e não grava nada.
 */
export async function matchSurgeryRequestAction(
  input: RequestExtraction
): Promise<{ analysis?: RequestAnalysis; error?: string }> {
  try {
    await requireActionPermission("surgeries", "edit");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  try {
    // Os dados vêm do navegador: valida e limita tudo de novo.
    const extraction = sanitizeExtraction(input);
    const supabase = await createClient();
    return { analysis: await analyzeExtraction(supabase, extraction) };
  } catch (e) {
    console.error("[reader] correspondência:", e);
    return { error: "Não foi possível buscar no cadastro agora. Tente novamente." };
  }
}

/**
 * Cadastro INICIAL do paciente (só o nome); o restante é completado depois na
 * ficha. Se já houver paciente com o mesmo nome, devolve o existente.
 */
export async function createPatientFromRequestAction(input: {
  full_name: string;
}): Promise<{ patient?: { id: string; full_name: string; existing: boolean }; error?: string }> {
  try {
    await requireActionPermission("surgeries", "edit");
    await requireActionPermission("patients", "edit");
  } catch {
    return { error: "Você não tem permissão para cadastrar pacientes." };
  }
  const name = input.full_name.replace(/\s+/g, " ").trim().slice(0, 200);
  if (name.length < 3) return { error: "Informe o nome completo do paciente." };
  const supabase = await createClient();
  try {
    const { data: same } = await supabase
      .from("patients")
      .select("id,full_name")
      .ilike("full_name", name.replace(/[%_\\]/g, (c) => `\\${c}`))
      .limit(1)
      .maybeSingle();
    if (same) return { patient: { ...(same as { id: string; full_name: string }), existing: true } };

    const created = await createPatient(supabase, {
      full_name: name,
      admin_notes: "Cadastro inicial criado pela leitura de pedido por foto. Completar os dados (CPF, nascimento, contato, convênio).",
    });
    revalidatePath("/surgeries/patients");
    return { patient: { id: created.id, full_name: created.full_name, existing: false } };
  } catch (e) {
    console.error("[reader] cadastro de paciente:", e);
    return { error: "Não foi possível cadastrar o paciente." };
  }
}

// ----------------------------------------------------------------------------
// Cadastro rápido, a partir da tela de revisão, do que ainda não está no catálogo
// ----------------------------------------------------------------------------

export type QuickCreateResult = { existing?: boolean; item?: { id: string; name: string; tuss_code: string | null }; error?: string };

/**
 * Cadastra no catálogo um procedimento lido da guia. O nome vem da TUSS 22
 * (descrição oficial do código) quando o código existe; senão, da descrição lida.
 * Se já houver procedimento com esse código TUSS, devolve o existente.
 */
export async function createProcedureFromRequestAction(input: {
  code: string | null;
  description: string;
  /** Nome revisado pelo usuário (tem prioridade sobre o nome oficial da TUSS). */
  name?: string;
  specialty?: string;
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
      if (existing) {
        return { existing: true, item: existing as { id: string; name: string; tuss_code: string | null } };
      }
    }
    let name = (input.name ?? "").trim() || input.description.trim();
    if (code && !input.name?.trim()) {
      const { data: official } = await supabase
        .from("tuss_terms")
        .select("name")
        .eq("table_name", "tuss-22")
        .eq("code", code)
        .maybeSingle();
      if (official?.name) name = official.name as string;
    }
    if (!name) return { error: "Sem nome para cadastrar este procedimento." };

    const parsed = procedureSchema.safeParse({
      name,
      tuss_code: code ?? "",
      specialty: (input.specialty ?? "").trim().slice(0, 100),
      active: "on",
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const created = await createProcedure(supabase, parsed.data);
    revalidatePath("/catalog/procedures");
    return { item: { id: created.id, name, tuss_code: code } };
  } catch (e) {
    console.error("[reader] cadastro de procedimento:", e);
    return { error: "Não foi possível cadastrar o procedimento." };
  }
}

/**
 * Cadastra no catálogo um material conforme a descrição preenchida na conferência
 * (nome + marca/medida). Não usa a tabela TUSS. Se houver fornecedor, vincula como preferencial.
 */
export async function createMaterialFromRequestAction(input: {
  name: string;
  details: string | null;
  supplierId?: string | null;
}): Promise<QuickCreateResult> {
  try {
    await requireActionPermission("surgeries", "edit");
    await requireActionPermission("materials", "edit");
  } catch {
    return { error: "Você não tem permissão para cadastrar materiais." };
  }
  const name = [input.name.trim(), input.details?.trim()].filter(Boolean).join(" ").slice(0, 300);
  if (!name) return { error: "Sem nome para cadastrar este material." };
  const supabase = await createClient();
  try {
    const { data: existing } = await supabase
      .from("materials_catalog")
      .select("id,name")
      .ilike("name", name.replace(/[%_\\]/g, (c) => `\\${c}`))
      .limit(1)
      .maybeSingle();
    if (existing) return { existing: true, item: { ...(existing as { id: string; name: string }), tuss_code: null } };

    const parsed = materialSchema.safeParse({ name, active: "on" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const created = await createMaterial(supabase, parsed.data);
    if (input.supplierId && /^[0-9a-f-]{36}$/i.test(input.supplierId)) {
      try {
        await addMaterialSupplier(supabase, created.id, input.supplierId, true);
      } catch (e) {
        console.error("[reader] vínculo de fornecedor:", e);
      }
    }
    revalidatePath("/catalog/materials");
    return { item: { id: created.id, name: created.name, tuss_code: null } };
  } catch (e) {
    console.error("[reader] cadastro de material:", e);
    return { error: "Não foi possível cadastrar o material." };
  }
}

/** Cadastro inicial de fornecedor (só o nome); o restante é completado depois. */
export async function createSupplierFromRequestAction(input: {
  name: string;
}): Promise<{ supplier?: { id: string; name: string }; error?: string }> {
  try {
    await requireActionPermission("surgeries", "edit");
    await requireActionPermission("suppliers", "edit");
  } catch {
    return { error: "Você não tem permissão para cadastrar fornecedores." };
  }
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 150);
  if (name.length < 2) return { error: "Informe o nome do fornecedor." };
  const supabase = await createClient();
  try {
    const { data: same } = await supabase
      .from("suppliers")
      .select("id,company_name")
      .ilike("company_name", name.replace(/[%_\\]/g, (c) => `\\${c}`))
      .limit(1)
      .maybeSingle();
    if (same) return { supplier: { id: same.id as string, name: same.company_name as string } };
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ company_name: name, active: true })
      .select("id,company_name")
      .single();
    if (error) throw error;
    revalidatePath("/catalog/suppliers");
    return { supplier: { id: data.id as string, name: data.company_name as string } };
  } catch (e) {
    console.error("[reader] cadastro de fornecedor:", e);
    return { error: "Não foi possível cadastrar o fornecedor." };
  }
}

/** Busca livre no catálogo de materiais (nome, código interno ou TUSS) para trocar a sugestão. */
export async function searchCatalogMaterialsAction(
  term: string
): Promise<{ results: { id: string; name: string }[] }> {
  try {
    await requireActionPermission("surgeries", "edit");
    const supabase = await createClient();
    // Catálogo pequeno: filtra em memória ignorando acento e caixa (o ilike do banco não ignora acento).
    const words = normalizeText(term).split(/\s+/).filter(Boolean);
    const rows = await fetchAll<{ id: string; name: string; internal_code: string | null; tuss_code: string | null }>(
      (from, to) =>
        supabase.from("materials_catalog").select("id,name,internal_code,tuss_code").eq("active", true).order("name").range(from, to)
    );
    const found = rows
      .filter((r) => {
        const hay = normalizeText(`${r.name} ${r.internal_code ?? ""} ${r.tuss_code ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 20);
    return { results: found.map((r) => ({ id: r.id, name: r.name })) };
  } catch {
    return { results: [] };
  }
}

/** Nomes dos fornecedores ativos, para sugerir na conferência (campo opcional). */
export async function listSupplierNamesAction(): Promise<{ names: string[] }> {
  try {
    await requireActionPermission("surgeries", "edit");
    const supabase = await createClient();
    const { data } = await supabase.from("suppliers").select("company_name").eq("active", true).order("company_name");
    return { names: ((data ?? []) as { company_name: string }[]).map((r) => r.company_name) };
  } catch {
    return { names: [] };
  }
}

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Regra de composições: diz se a combinação (procedimentos + materiais +
 * quantidades) já existe (será reutilizada), é uma variação de um
 * conjunto de procedimentos já conhecido, ou é inédita. Não grava nada.
 * Também devolve as composições já cadastradas para o mesmo conjunto.
 */
export async function previewCompositionAction(input: {
  procedureIds: string[];
  materials: { id: string; quantity: number }[];
}): Promise<{
  preview?: Awaited<ReturnType<typeof previewComposition>>;
  existing?: Awaited<ReturnType<typeof listCompositionsForProcedures>>;
  error?: string;
}> {
  try {
    await requireActionPermission("surgeries", "edit");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const procedureIds = (input.procedureIds ?? []).filter((id) => UUID.test(id)).slice(0, 20);
  const materials = (input.materials ?? [])
    .filter((m) => UUID.test(m.id))
    .slice(0, 60)
    .map((m) => ({ material_id: m.id, quantity: Number(m.quantity) > 0 ? Number(m.quantity) : 1 }));
  try {
    const supabase = await createClient();
    const [preview, existing] = await Promise.all([
      previewComposition(supabase, procedureIds, materials),
      listCompositionsForProcedures(supabase, procedureIds),
    ]);
    return { preview, existing };
  } catch (e) {
    // Migração 0024 ainda não aplicada, etc.: o fluxo segue sem a informação.
    console.error("[reader] composição:", e);
    return { error: "unavailable" };
  }
}
