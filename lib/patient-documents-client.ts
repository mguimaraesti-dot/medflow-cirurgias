"use client";

import { createClient } from "@/lib/supabase/client";
import {
  abortDocumentUploadAction,
  finalizeDocumentUploadAction,
  prepareDocumentUploadAction,
} from "@/app/(dashboard)/surgeries/patients/documents-actions";
import { PATIENT_DOCUMENTS_BUCKET, type DocumentCategory } from "@/lib/patient-documents";

/**
 * Envia um arquivo ao bucket privado em 3 passos: o servidor valida e emite
 * uma URL assinada → o navegador envia direto ao Storage (evita o limite de
 * corpo de requisição da Vercel) → o servidor confere o conteúdo e só então
 * cria o registro. Retorna a mensagem de erro, ou null em caso de sucesso.
 */
export async function uploadPatientDocument(
  patientId: string,
  file: File,
  category: DocumentCategory
): Promise<string | null> {
  const prepared = await prepareDocumentUploadAction(patientId, {
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if ("error" in prepared) return prepared.error;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(PATIENT_DOCUMENTS_BUCKET)
    .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: prepared.mime });
  if (uploadError) {
    await abortDocumentUploadAction(patientId, prepared.path).catch(() => {});
    return `"${file.name}": falha no envio. Verifique sua conexão e tente novamente.`;
  }

  const finalized = await finalizeDocumentUploadAction(patientId, {
    path: prepared.path,
    name: file.name,
    category,
  });
  return "error" in finalized ? finalized.error : null;
}
