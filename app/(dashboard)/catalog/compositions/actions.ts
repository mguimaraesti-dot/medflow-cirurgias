"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { renameComposition } from "@/lib/data/compositions";

/**
 * Só o NOME descritivo pode ser alterado. Procedimentos, materiais,
 * quantidades e vínculos com guias nunca mudam retroativamente.
 */
export async function renameCompositionAction(
  id: string,
  name: string
): Promise<{ error?: string }> {
  try {
    await requireActionPermission("procedures", "edit");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 3) return { error: "Informe um nome com pelo menos 3 caracteres." };
  if (clean.length > 150) return { error: "O nome pode ter no máximo 150 caracteres." };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Composição inválida." };
  try {
    const supabase = await createClient();
    await renameComposition(supabase, id, clean);
  } catch {
    return { error: "Não foi possível salvar o nome. Tente novamente." };
  }
  revalidatePath("/catalog/compositions");
  return {};
}
