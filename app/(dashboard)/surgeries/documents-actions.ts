"use server";

import { revalidatePath } from "next/cache";
import { advanceSurgeryStage } from "@/lib/data/surgery-stage-advance";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireActionPermission } from "@/lib/auth/guard";
import { addSurgeryDocument, removeSurgeryDocument } from "@/lib/data/surgery-documents";

export type SurgeryDocumentFormState = {
  error?: string;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function uploadSurgeryDocumentAction(
  surgeryId: string,
  _prevState: SurgeryDocumentFormState,
  formData: FormData
): Promise<SurgeryDocumentFormState> {
  const file = formData.get("file");
  const description = formData.get("description");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Arquivo muito grande (máximo 15 MB)." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  const user = await getCurrentUser();

  try {
    await addSurgeryDocument(
      supabase,
      surgeryId,
      file,
      typeof description === "string" ? description : undefined,
      user?.id ?? null
    );
  } catch {
    return { error: "Não foi possível enviar o documento. Tente novamente." };
  }

  await advanceSurgeryStage(supabase, surgeryId);
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

export async function removeSurgeryDocumentAction(id: string, surgeryId: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await removeSurgeryDocument(supabase, id);
  revalidatePath(`/surgeries/${surgeryId}`);
}
