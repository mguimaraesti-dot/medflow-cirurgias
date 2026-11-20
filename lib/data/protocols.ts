import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProtocolInput, ProtocolItemInput } from "@/lib/validation/protocols";

export type Protocol = {
  id: string;
  procedure_id: string;
  hospital_id: string | null;
  name: string;
  active: boolean;
  created_at: string;
  procedure: { id: string; name: string } | null;
  hospital: { id: string; name: string } | null;
};

export type ProtocolVersion = {
  id: string;
  protocol_id: string;
  version_number: number;
  status: "draft" | "pending_approval" | "approved" | "archived";
  approved_at: string | null;
  notes: string | null;
  created_at: string;
};

export type ProtocolItem = {
  id: string;
  protocol_version_id: string;
  material_id: string;
  quantity: number;
  unit: string | null;
  specs: string | null;
  preferred_supplier_id: string | null;
  notes: string | null;
  material: { id: string; name: string } | null;
  preferred_supplier: { id: string; company_name: string } | null;
};

const PROTOCOL_COLUMNS =
  "id,procedure_id,hospital_id,name,active,created_at,procedure:procedures(id,name),hospital:hospitals(id,name)";

export async function listProtocols(supabase: SupabaseClient, search?: string) {
  let query = supabase
    .from("procedure_protocols")
    .select(PROTOCOL_COLUMNS)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Protocol[];
}

export async function getProtocol(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("procedure_protocols")
    .select(PROTOCOL_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Protocol;
}

export async function createProtocol(supabase: SupabaseClient, input: ProtocolInput) {
  const { data, error } = await supabase
    .from("procedure_protocols")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;

  // Toda vez que um protocolo nasce, já cria a versão 1 em rascunho —
  // ninguém usa um protocolo sem nenhuma versão.
  const { error: versionError } = await supabase
    .from("protocol_versions")
    .insert({ protocol_id: data.id, version_number: 1, status: "draft" });
  if (versionError) throw versionError;

  return data as { id: string };
}

export async function listProtocolVersions(supabase: SupabaseClient, protocolId: string) {
  const { data, error } = await supabase
    .from("protocol_versions")
    .select("id,protocol_id,version_number,status,approved_at,notes,created_at")
    .eq("protocol_id", protocolId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return data as ProtocolVersion[];
}

export async function getProtocolVersion(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("protocol_versions")
    .select("id,protocol_id,version_number,status,approved_at,notes,created_at")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ProtocolVersion;
}

export async function createProtocolVersion(
  supabase: SupabaseClient,
  protocolId: string,
  cloneFromVersionId?: string
) {
  const { data: last, error: lastError } = await supabase
    .from("protocol_versions")
    .select("version_number")
    .eq("protocol_id", protocolId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const nextNumber = (last?.version_number ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("protocol_versions")
    .insert({ protocol_id: protocolId, version_number: nextNumber, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;

  if (cloneFromVersionId) {
    const { data: items, error: itemsError } = await supabase
      .from("protocol_items")
      .select("material_id,quantity,unit,specs,preferred_supplier_id,notes")
      .eq("protocol_version_id", cloneFromVersionId);
    if (itemsError) throw itemsError;

    if (items && items.length > 0) {
      const rows = items.map((item) => ({ ...item, protocol_version_id: created.id }));
      const { error: insertError } = await supabase.from("protocol_items").insert(rows);
      if (insertError) throw insertError;
    }
  }

  return created as { id: string };
}

export async function setProtocolVersionStatus(
  supabase: SupabaseClient,
  id: string,
  status: ProtocolVersion["status"]
) {
  const payload: Record<string, unknown> = { status };
  if (status === "approved") {
    payload.approved_at = new Date().toISOString();
  }
  const { error } = await supabase.from("protocol_versions").update(payload).eq("id", id);
  if (error) throw error;
}

export type ImportableProtocolVersion = {
  id: string;
  version_number: number;
  protocol_name: string;
  hospital_id: string | null;
};

export async function listApprovedProtocolVersionsForSurgery(
  supabase: SupabaseClient,
  procedureId: string,
  hospitalId: string
) {
  const { data: protocols, error } = await supabase
    .from("procedure_protocols")
    .select("id,name,hospital_id")
    .eq("procedure_id", procedureId)
    .eq("active", true)
    .or(`hospital_id.eq.${hospitalId},hospital_id.is.null`);
  if (error) throw error;
  if (!protocols || protocols.length === 0) return [];

  const { data: versions, error: versionsError } = await supabase
    .from("protocol_versions")
    .select("id,version_number,protocol_id")
    .eq("status", "approved")
    .in(
      "protocol_id",
      protocols.map((p) => p.id)
    );
  if (versionsError) throw versionsError;

  const protocolById = new Map(protocols.map((p) => [p.id, p]));
  return (versions ?? []).map((v) => ({
    id: v.id,
    version_number: v.version_number,
    protocol_name: protocolById.get(v.protocol_id)?.name ?? "",
    hospital_id: protocolById.get(v.protocol_id)?.hospital_id ?? null,
  })) as ImportableProtocolVersion[];
}

export async function listProtocolItems(supabase: SupabaseClient, versionId: string) {
  const { data, error } = await supabase
    .from("protocol_items")
    .select(
      "id,protocol_version_id,material_id,quantity,unit,specs,preferred_supplier_id,notes,material:materials_catalog(id,name),preferred_supplier:suppliers(id,company_name)"
    )
    .eq("protocol_version_id", versionId);
  if (error) throw error;
  return data as unknown as ProtocolItem[];
}

export async function addProtocolItem(
  supabase: SupabaseClient,
  versionId: string,
  input: ProtocolItemInput
) {
  const { error } = await supabase
    .from("protocol_items")
    .insert({ protocol_version_id: versionId, ...input });
  if (error) throw error;
}

export async function removeProtocolItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("protocol_items").delete().eq("id", id);
  if (error) throw error;
}
