import type { SupabaseClient } from "@supabase/supabase-js";

import type { PatientAddress } from "@/lib/patient-address";

export type Patient = {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  /** jsonb: texto simples (cadastros antigos) ou PatientAddress. */
  address: unknown;
  insurance_provider_id: string | null;
  insurance_card_number: string | null;
  insurance_card_validity: string | null;
  admin_notes: string | null;
  created_at: string;
  insurance_provider: { id: string; name: string } | null;
};

/** Idade em anos completos a partir da data de nascimento — usada na
 * listagem e no cadastro do paciente, em vez do CPF (que não ajuda
 * clinicamente e o Dr. Flávio nem sempre tem em mãos). */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate + "T00:00:00");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const SELECT_COLUMNS =
  "id,full_name,cpf,birth_date,phone,whatsapp,email,address,insurance_provider_id,insurance_card_number,insurance_card_validity,admin_notes,created_at,insurance_provider:insurance_providers(id,name)";

export async function listPatients(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("patients")
    .select(SELECT_COLUMNS)
    .order("full_name", { ascending: true });

  if (search) {
    // CPF e telefone ficam gravados só com dígitos: busca também pela versão numérica
    // (quem digita "225.109..." ou "(17) 9...").
    const digits = search.replace(/\D/g, "");
    // Valores entre aspas: vírgula/parêntese digitados na busca não quebram o filtro .or().
    const like = (column: string, term: string) =>
      `${column}.ilike."%${term.replace(/(["\\])/g, "\\$1")}%"`;
    const clauses = [like("full_name", search), like("cpf", search), like("phone", search)];
    if (digits.length >= 3 && digits !== search) {
      clauses.push(like("cpf", digits), like("phone", digits));
    }
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Patient[];
}

export async function listActivePatientsForSelect(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("patients")
    .select("id,full_name,cpf")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data as Pick<Patient, "id" | "full_name" | "cpf">[];
}

export async function getPatient(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("patients")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Patient;
}

// Colunas gravadas em `patients`. Os campos de convênio aceitam `null`
// explícito — usado para realmente limpar esses dados quando o paciente
// passa a ser particular (campo ausente só deixaria a coluna intocada).
export type PatientUpdateInput = {
  full_name: string;
  cpf?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: PatientAddress | null;
  insurance_provider_id?: string | null;
  insurance_card_number?: string | null;
  insurance_card_validity?: string | null;
  admin_notes?: string | null;
};

/** Paciente com o mesmo CPF (só dígitos), exceto `excludeId`. */
export async function findPatientByCpf(supabase: SupabaseClient, cpfDigits: string, excludeId?: string) {
  let query = supabase.from("patients").select("id,full_name").eq("cpf", cpfDigits).limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.[0] as { id: string; full_name: string } | undefined) ?? null;
}

/** Paciente com mesmo nome e data de nascimento (alerta quando não há CPF). */
export async function findPatientByNameAndBirth(
  supabase: SupabaseClient,
  fullName: string,
  birthDate: string,
  excludeId?: string
) {
  let query = supabase
    .from("patients")
    .select("id,full_name")
    .ilike("full_name", fullName.replace(/[%_]/g, "\\$&"))
    .eq("birth_date", birthDate)
    .limit(1);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data?.[0] as { id: string; full_name: string } | undefined) ?? null;
}

export async function createPatient(supabase: SupabaseClient, input: PatientUpdateInput) {
  const { data, error } = await supabase
    .from("patients")
    .insert(input)
    .select("id,full_name")
    .single();
  if (error) throw error;
  return data as { id: string; full_name: string };
}

export async function updatePatient(
  supabase: SupabaseClient,
  id: string,
  input: PatientUpdateInput
) {
  const { error } = await supabase.from("patients").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePatient(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}
