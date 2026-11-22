import { createAdminClient } from "@/lib/supabase/server";
import { PATIENT_DOCUMENTS_BUCKET } from "@/lib/patient-documents";

/**
 * Acesso às tabelas/bucket de documentos do paciente. Usa o cliente service
 * role de propósito: tabelas e bucket não têm policy para usuários logados
 * (migração 0023). QUEM CHAMA precisa ter checado a permissão do módulo
 * "patients" antes (requireActionPermission / requireModuleView).
 */

export type PatientDocument = {
  id: string;
  patient_id: string;
  category: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
};

const COLUMNS = "id,patient_id,category,file_path,file_name,mime_type,size_bytes,created_at,uploaded_by";

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_documents")
    .select(COLUMNS)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Omit<PatientDocument, "uploaded_by_name">[];

  const userIds = [...new Set(rows.map((r) => r.uploaded_by).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id,full_name").in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      if (p.full_name) names.set(p.id, p.full_name);
    }
  }
  return rows.map((r) => ({ ...r, uploaded_by_name: r.uploaded_by ? (names.get(r.uploaded_by) ?? null) : null }));
}

export async function countPatientDocuments(patientId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("patient_documents")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId);
  if (error) throw error;
  return count ?? 0;
}

export function patientDocumentsStorage() {
  return createAdminClient().storage.from(PATIENT_DOCUMENTS_BUCKET);
}
