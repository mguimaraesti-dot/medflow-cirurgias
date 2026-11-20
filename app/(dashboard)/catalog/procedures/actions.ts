"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createProcedure,
  updateProcedure,
  setProcedureActive,
  deleteProcedure,
  hasProcedureProtocols,
} from "@/lib/data/procedures";
import { procedureSchema } from "@/lib/validation/procedures";
import { toDeleteErrorMessage } from "@/lib/delete-error";

export type ProcedureFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return procedureSchema.safeParse({
    internal_code: formData.get("internal_code"),
    name: formData.get("name"),
    specialty: formData.get("specialty"),
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

  const supabase = await createClient();
  try {
    await createProcedure(supabase, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  return {};
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

  const supabase = await createClient();
  try {
    await updateProcedure(supabase, id, parsed.data);
  } catch (e) {
    return { error: toUserMessage(e) };
  }

  revalidatePath("/catalog/procedures");
  return {};
}

export async function toggleProcedureActiveAction(id: string, active: boolean) {
  const supabase = await createClient();
  await setProcedureActive(supabase, id, active);
  revalidatePath("/catalog/procedures");
}

export async function deleteProcedureAction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  if (await hasProcedureProtocols(supabase, id)) {
    return {
      error:
        "Não é possível excluir: existem protocolos de materiais cadastrados para este procedimento. Você pode inativar em vez de excluir.",
    };
  }

  try {
    await deleteProcedure(supabase, id);
  } catch (e) {
    return { error: toDeleteErrorMessage(e, "este procedimento está vinculado a cirurgias cadastradas") };
  }

  revalidatePath("/catalog/procedures");
  return {};
}
