import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "surgery-documents";
const SIGNED_URL_EXPIRES_IN = 60 * 60; // 1 hora — tempo suficiente para abrir/baixar na sessão

export type SurgeryDocument = {
  id: string;
  surgery_id: string;
  file_path: string;
  file_name: string;
  description: string | null;
  created_at: string;
  /** Preenchido em listSurgeryDocuments; não é uma coluna do banco. */
  download_url: string | null;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function listSurgeryDocuments(
  supabase: SupabaseClient,
  surgeryId: string
): Promise<SurgeryDocument[]> {
  const { data, error } = await supabase
    .from("surgery_documents")
    .select("id,surgery_id,file_path,file_name,description,created_at")
    .eq("surgery_id", surgeryId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<SurgeryDocument, "download_url">[];

  const withUrls = await Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_EXPIRES_IN);
      return { ...row, download_url: signed?.signedUrl ?? null };
    })
  );

  return withUrls;
}

/** Quantidade de documentos anexados por cirurgia — usado na visão em
 * lista do Mapa Cirúrgico, pra mostrar a situação da "Solicitação
 * hospitalar" sem precisar de uma consulta por linha. */
export async function countSurgeryDocumentsBySurgery(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("surgery_documents").select("surgery_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.surgery_id] = (counts[row.surgery_id] ?? 0) + 1;
  }
  return counts;
}

export async function addSurgeryDocument(
  supabase: SupabaseClient,
  surgeryId: string,
  file: File,
  description: string | undefined,
  uploadedBy: string | null
) {
  const path = `${surgeryId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("surgery_documents").insert({
    surgery_id: surgeryId,
    file_path: path,
    file_name: file.name,
    description: description || null,
    uploaded_by: uploadedBy,
  });
  if (insertError) {
    // Não deixa o arquivo órfão no storage se o registro falhar.
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }
}

export async function removeSurgeryDocument(supabase: SupabaseClient, id: string) {
  const { data: row, error: fetchError } = await supabase
    .from("surgery_documents")
    .select("file_path")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const { error: deleteError } = await supabase.from("surgery_documents").delete().eq("id", id);
  if (deleteError) throw deleteError;

  if (row?.file_path) {
    await supabase.storage.from(BUCKET).remove([row.file_path]);
  }
}
