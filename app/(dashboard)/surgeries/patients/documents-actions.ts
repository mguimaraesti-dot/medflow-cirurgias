"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { patientDocumentsStorage } from "@/lib/data/patient-documents";
import {
  isDocumentCategory,
  matchesSignature,
  mimeForName,
  sanitizeFileName,
  validateDocumentMeta,
  MAX_DOCUMENT_BYTES,
} from "@/lib/patient-documents";

const NO_PERMISSION = "Você não tem permissão para esta ação.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Tempo de vida dos links de visualização/download. */
const SIGNED_URL_SECONDS = 120;

async function guard(action: "view" | "edit") {
  try {
    return await requireActionPermission("patients", action);
  } catch {
    return null;
  }
}

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/relation .*patient_documents.* does not exist|patient_documents.*schema cache|Bucket not found/i.test(msg)) {
    return "O armazenamento de documentos ainda não foi configurado (migração 0023 pendente).";
  }
  return null;
}

/** 1/3 — valida e devolve uma URL assinada para o navegador enviar direto ao Storage. */
export async function prepareDocumentUploadAction(
  patientId: string,
  meta: { name: string; size: number; type: string }
): Promise<{ error: string } | { path: string; token: string; mime: string }> {
  if (!(await guard("edit"))) return { error: NO_PERMISSION };
  if (!UUID.test(patientId)) return { error: "Paciente inválido." };
  const metaError = validateDocumentMeta(meta);
  if (metaError) return { error: metaError };

  try {
    const admin = createAdminClient();
    const { data: patient } = await admin.from("patients").select("id").eq("id", patientId).maybeSingle();
    if (!patient) return { error: "Paciente não encontrado." };

    const path = `${patientId}/${crypto.randomUUID()}-${sanitizeFileName(meta.name)}`;
    const { data, error } = await patientDocumentsStorage().createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("sem URL");
    return { path, token: data.token, mime: mimeForName(meta.name)! };
  } catch (e) {
    return { error: friendly(e) ?? "Não foi possível iniciar o envio. Tente novamente." };
  }
}

/** 2/3 — confere o arquivo já enviado (tamanho + assinatura) e só então cria o registro. */
export async function finalizeDocumentUploadAction(
  patientId: string,
  input: { path: string; name: string; category: string }
): Promise<{ error: string } | { id: string }> {
  const user = await guard("edit");
  if (!user) return { error: NO_PERMISSION };
  if (!UUID.test(patientId) || !input.path.startsWith(`${patientId}/`) || input.path.includes("..")) {
    return { error: "Envio inválido." };
  }
  if (!isDocumentCategory(input.category)) return { error: "Escolha a categoria do documento." };
  const mime = mimeForName(input.name);
  if (!mime) return { error: "Formato não permitido." };

  const storage = patientDocumentsStorage();
  const admin = createAdminClient();
  const discard = () => storage.remove([input.path]);

  try {
    const { data: blob, error: downloadError } = await storage.download(input.path);
    if (downloadError || !blob) return { error: "O arquivo não chegou ao armazenamento. Tente novamente." };
    if (blob.size <= 0 || blob.size > MAX_DOCUMENT_BYTES) {
      await discard();
      return { error: "Tamanho de arquivo inválido." };
    }
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
    if (!matchesSignature(head, mime)) {
      await discard();
      return { error: `"${input.name}": o conteúdo não corresponde a um arquivo ${mime.split("/")[1].toUpperCase()} válido.` };
    }

    const { data: row, error: insertError } = await admin
      .from("patient_documents")
      .insert({
        patient_id: patientId,
        category: input.category,
        file_path: input.path,
        file_name: input.name,
        mime_type: mime,
        size_bytes: blob.size,
        uploaded_by: user.id,
      })
      .select("id")
      .single();
    if (insertError || !row) {
      await discard();
      return { error: friendly(insertError) ?? "Não foi possível registrar o documento." };
    }

    await admin.from("patient_document_events").insert({
      patient_id: patientId,
      document_id: row.id,
      action: "upload",
      file_name: input.name,
      category: input.category,
      user_id: user.id,
    });

    revalidatePath(`/surgeries/patients/${patientId}`);
    return { id: row.id };
  } catch (e) {
    await discard().catch(() => {});
    return { error: friendly(e) ?? "Não foi possível registrar o documento." };
  }
}

/** Remove um arquivo enviado que não chegou a virar registro (falha no meio do caminho). */
export async function abortDocumentUploadAction(patientId: string, path: string): Promise<void> {
  if (!(await guard("edit"))) return;
  if (!UUID.test(patientId) || !path.startsWith(`${patientId}/`) || path.includes("..")) return;
  const admin = createAdminClient();
  const { data } = await admin.from("patient_documents").select("id").eq("file_path", path).maybeSingle();
  if (data) return; // já é um documento válido: não mexe
  await patientDocumentsStorage().remove([path]);
}

/** Link temporário (2 min) para abrir ou baixar. Nunca expõe URL pública. */
export async function getDocumentUrlAction(
  id: string,
  mode: "view" | "download"
): Promise<{ error: string } | { url: string }> {
  if (!(await guard("view"))) return { error: NO_PERMISSION };
  if (!UUID.test(id)) return { error: "Documento inválido." };
  try {
    const admin = createAdminClient();
    const { data: doc } = await admin
      .from("patient_documents")
      .select("file_path,file_name")
      .eq("id", id)
      .maybeSingle();
    if (!doc) return { error: "Documento não encontrado." };
    const { data, error } = await patientDocumentsStorage().createSignedUrl(
      doc.file_path,
      SIGNED_URL_SECONDS,
      mode === "download" ? { download: doc.file_name } : undefined
    );
    if (error || !data) throw error ?? new Error("sem URL");
    return { url: data.signedUrl };
  } catch (e) {
    return { error: friendly(e) ?? "Não foi possível abrir o documento." };
  }
}

export async function deleteDocumentAction(id: string): Promise<{ error?: string }> {
  const user = await guard("edit");
  if (!user) return { error: NO_PERMISSION };
  if (!UUID.test(id)) return { error: "Documento inválido." };
  try {
    const admin = createAdminClient();
    const { data: doc } = await admin
      .from("patient_documents")
      .select("id,patient_id,file_path,file_name,category")
      .eq("id", id)
      .maybeSingle();
    if (!doc) return { error: "Documento não encontrado." };

    // Primeiro o arquivo: se falhar, o registro continua e dá para tentar de novo.
    const { error: removeError } = await patientDocumentsStorage().remove([doc.file_path]);
    if (removeError) throw removeError;

    const { error: deleteError } = await admin.from("patient_documents").delete().eq("id", id);
    if (deleteError) throw deleteError;

    await admin.from("patient_document_events").insert({
      patient_id: doc.patient_id,
      document_id: doc.id,
      action: "delete",
      file_name: doc.file_name,
      category: doc.category,
      user_id: user.id,
    });

    revalidatePath(`/surgeries/patients/${doc.patient_id}`);
    return {};
  } catch (e) {
    return { error: friendly(e) ?? "Não foi possível excluir o documento." };
  }
}

/** Carteirinhas (categoria "insurance_card") enviadas para o paciente, da mais recente para a mais antiga. */
export async function listInsuranceCardsAction(
  patientId: string
): Promise<{ error: string } | { cards: { id: string; file_name: string; created_at: string; mime_type: string }[] }> {
  if (!(await guard("view"))) return { error: NO_PERMISSION };
  if (!UUID.test(patientId)) return { error: "Paciente inválido." };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("patient_documents")
      .select("id,file_name,created_at,mime_type")
      .eq("patient_id", patientId)
      .eq("category", "insurance_card")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { cards: (data ?? []) as { id: string; file_name: string; created_at: string; mime_type: string }[] };
  } catch (e) {
    return { error: friendly(e) ?? "Não foi possível listar as carteirinhas." };
  }
}
