"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  createProcedure,
  updateProcedure,
  setProcedureActive,
  deleteProcedure,
  countProcedureSurgeries,
} from "@/lib/data/procedures";
import { listActiveSuppliersForSelect } from "@/lib/data/suppliers";
import { procedureSchema } from "@/lib/validation/procedures";
import { toDeleteErrorMessage } from "@/lib/delete-error";
import {
  listDefaultMaterials,
  saveDefaultMaterials,
  searchActiveMaterials,
  type MaterialSearchResult,
  type ProcedureDefaultMaterial,
} from "@/lib/data/procedure-materials";
import { procedureKitSchema } from "@/lib/validation/procedure-materials";
import { searchLocalTuss } from "@/lib/data/tuss-local";
import { todayInSaoPaulo } from "@/lib/utils";
import { searchTussProcedures, describeTussError, type TussResult } from "@/lib/tuss";

export type ProcedureFormState = {
  error?: string;
  /** Preenchido ao criar: permite oferecer "Configurar materiais padrão" em seguida. */
  created?: { id: string; internal_code: string | null };
};

function parseForm(formData: FormData) {
  return procedureSchema.safeParse({
    internal_code: formData.get("internal_code"),
    name: formData.get("name"),
    tuss_code: formData.get("tuss_code"),
    specialty: formData.get("specialty"),
    location: formData.get("location"),
    description: formData.get("description"),
    admin_notes: formData.get("admin_notes"),
    active: formData.get("active"),
  });
}

function toUserMessage(e: unknown) {
  const message = e instanceof Error ? e.message : "";
  if (message.includes("procedures_internal_code_key")) {
    return "Já existe um procedimento com esse código interno.";
  }
  return "Não foi possível salvar o procedimento. Tente novamente.";
}

export async function createProcedureAction(
  _prevState: ProcedureFormState,
  formData: FormData
): Promise<ProcedureFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("procedures");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  let created;
  try {
    created = await createProcedure(supabase, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  return { created };
}

export async function updateProcedureAction(
  id: string,
  _prevState: ProcedureFormState,
  formData: FormData
): Promise<ProcedureFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("procedures");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateProcedure(supabase, id, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  revalidatePath(`/catalog/procedures/${id}`);
  return {};
}

export async function toggleProcedureActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  try {
    await requireActionPermission("procedures");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();
  try {
    await setProcedureActive(supabase, id, active);
  } catch {
    return { error: "Não foi possível alterar o status. Tente novamente." };
  }
  revalidatePath("/catalog/procedures");
  revalidatePath(`/catalog/procedures/${id}`);
  return {};
}

export async function deleteProcedureAction(id: string): Promise<{ error?: string }> {
  try {
    await requireActionPermission("procedures");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();

  try {
    // Procedimento usado em cirurgia mantém o histórico: não é excluído (inativar).
    const used = await countProcedureSurgeries(supabase, id);
    if (used > 0) {
      return {
        error: `Este procedimento está em ${used} cirurgia${used === 1 ? "" : "s"} e não pode ser excluído. Inative-o: ele deixa de aparecer em novas cirurgias e o histórico é preservado.`,
      };
    }
    await deleteProcedure(supabase, id);
  } catch (e) {
    return { error: toDeleteErrorMessage(e, "este procedimento está vinculado a cirurgias cadastradas") };
  }

  revalidatePath("/catalog/procedures");
  return {};
}

// ----------------------------------------------------------------------------
// Materiais padrão do procedimento (kit que o médico costuma usar)
// ----------------------------------------------------------------------------

/** Itens do kit + fornecedores, buscados sob demanda ao abrir o editor (a listagem só carrega a contagem). */
export async function getKitEditorDataAction(
  procedureId: string
): Promise<{ items: ProcedureDefaultMaterial[]; suppliers: { id: string; company_name: string }[] } | { error: string }> {
  try {
    await requireActionPermission("procedures", "view");
    const supabase = await createClient();
    const [items, suppliers] = await Promise.all([
      listDefaultMaterials(supabase, procedureId),
      listActiveSuppliersForSelect(supabase),
    ]);
    return { items, suppliers };
  } catch {
    return { error: "Não foi possível carregar os materiais padrão." };
  }
}

export async function searchMaterialsAction(term: string): Promise<{ results: MaterialSearchResult[] }> {
  try {
    await requireActionPermission("procedures", "view");
    const supabase = await createClient();
    return { results: await searchActiveMaterials(supabase, term) };
  } catch {
    return { results: [] };
  }
}

/** Salva o kit padrão inteiro (itens, quantidades e unidades) a partir da lista editada. */
export async function saveDefaultMaterialsAction(
  procedureId: string,
  items: { material_id: string; quantity: number; unit: string | null; preferred_supplier_id: string | null }[]
): Promise<{ error?: string }> {
  const parsed = procedureKitSchema.safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await requireActionPermission("procedures");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();
  try {
    await saveDefaultMaterials(supabase, procedureId, parsed.data);
  } catch {
    return { error: "Não foi possível salvar os materiais padrão. Tente novamente." };
  }
  revalidatePath(`/catalog/procedures/${procedureId}`);
  revalidatePath("/catalog/procedures");
  return {};
}

// ----------------------------------------------------------------------------
// Busca de código TUSS na base pública da ANS
// ----------------------------------------------------------------------------

export async function searchTussCodesAction(
  query: string
): Promise<{ results?: TussResult[]; error?: string }> {
  try {
    await requireActionPermission("procedures", "view");
    const supabase = await createClient();
    const local = await searchLocalTuss(supabase, "tuss-22", query, todayInSaoPaulo());
    if (local) return { results: local };
    // Cópia local ainda não carregada: consulta a ANS ao vivo (mais lenta).
    const results = await searchTussProcedures(query);
    return { results };
  } catch (e) {
    const reason = describeTussError(e);
    console.error("[tuss] falha na busca:", e);
    return {
      error: `Não foi possível consultar a tabela TUSS agora (${reason}). Você pode digitar o código manualmente.`,
    };
  }
}
