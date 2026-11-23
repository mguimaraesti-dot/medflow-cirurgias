/**
 * Assinatura canônica de uma composição (procedimentos + materiais).
 *
 * Regras:
 * - Procedimentos: identificados pelo código TUSS; sem TUSS, pelo ID do cadastro.
 * - Materiais: identificados pelo ID do cadastro no catálogo (o TUSS do
 *   material é opcional e, quando existe, já é único por cadastro).
 * - Quantidades diferentes geram composições diferentes.
 * - A ordem NÃO influencia: tudo é ordenado e repetições são somadas.
 */
export type SignatureProcedure = { id: string; tuss_code: string | null };
export type SignatureMaterial = { material_id: string; quantity: number };

function normQty(q: number): string {
  const n = Number.isFinite(q) && q > 0 ? q : 1;
  return String(Math.round(n * 1000) / 1000);
}

export function procedureKey(p: SignatureProcedure): string {
  const code = (p.tuss_code ?? "").trim();
  return code ? `T${code}` : `I${p.id}`;
}

export function buildCompositionSignature(
  procedures: SignatureProcedure[],
  materials: SignatureMaterial[]
): string {
  const procKeys = [...new Set(procedures.map(procedureKey))].sort();

  const qtyByMaterial = new Map<string, number>();
  for (const m of materials) {
    const q = Number.isFinite(m.quantity) && m.quantity > 0 ? m.quantity : 1;
    qtyByMaterial.set(m.material_id, (qtyByMaterial.get(m.material_id) ?? 0) + q);
  }
  const matKeys = [...qtyByMaterial.entries()]
    .map(([id, q]) => `${id}x${normQty(q)}`)
    .sort();

  return `P:${procKeys.join(",")}|M:${matKeys.join(",")}`;
}

/** Assinatura só dos procedimentos (para achar composições do mesmo conjunto). */
export function procedureSetKey(procedures: SignatureProcedure[]): string {
  return [...new Set(procedures.map(procedureKey))].sort().join(",");
}

/** Código interno exibido: CMP-000001 (derivado do número sequencial; não editável). */
export function formatCompositionCode(n: number): string {
  return `CMP-${String(n).padStart(6, "0")}`;
}

/** Nome sugerido: procedimento principal + os demais (limitado a 120 caracteres). */
export function suggestCompositionName(
  procedures: { name: string; is_primary: boolean }[]
): string {
  const ordered = [...procedures].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const name = ordered.map((p) => p.name.trim()).filter(Boolean).join(" + ");
  return name.length > 120 ? `${name.slice(0, 117)}...` : name;
}
