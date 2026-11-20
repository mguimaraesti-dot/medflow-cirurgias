import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";

/**
 * Compara a lista de materiais usados numa cirurgia com o kit padrão atual
 * do procedimento (por material + quantidade + fornecedor). Usada para
 * decidir se mostramos o aviso "atualizar o padrão?". Função pura (sem
 * acesso a banco), para poder ser importada direto em componente client.
 */
export function materialsDifferFromDefault(
  surgeryItems: { material_id: string; quantity: number; supplier_id: string | null }[],
  defaults: ProcedureDefaultMaterial[]
): boolean {
  if (surgeryItems.length !== defaults.length) return true;

  const key = (m: { material_id: string; quantity: number; supplier_id: string | null }) =>
    `${m.material_id}:${m.quantity}:${m.supplier_id ?? ""}`;

  const surgerySet = new Set(surgeryItems.map(key));
  const defaultSet = new Set(
    defaults.map((d) =>
      key({ material_id: d.material_id, quantity: d.quantity, supplier_id: d.preferred_supplier_id })
    )
  );

  if (surgerySet.size !== defaultSet.size) return true;
  for (const k of surgerySet) {
    if (!defaultSet.has(k)) return true;
  }
  return false;
}
