/**
 * Padrão de nome de material: primeira letra maiúscula e o restante em
 * minúsculas ("Alça de polipectomia"). Só mexe em palavras escritas TODAS em
 * maiúsculas; palavras com caixa mista (marcas como "Roadrunner") e palavras
 * com dígitos/medidas (10Fr, 0.035") são preservadas. Siglas conhecidas
 * continuam em maiúsculas.
 */
const ACRONYMS = new Set(["CPRE", "PTFE", "PVC", "TUSS", "OPME", "USB", "LED", "CPAP", "EDA", "CID"]);

export function normalizeMaterialName(raw: string): string {
  const words = raw.replace(/\s+/g, " ").trim().split(" ");
  const out = words.map((w) => {
    const letters = w.replace(/[^\p{L}]/gu, "");
    if (!letters) return w;
    if (/\d/.test(w)) return w;
    const isAllCaps = letters.length > 1 && letters === letters.toUpperCase();
    if (!isAllCaps) return w;
    if (ACRONYMS.has(letters)) return w;
    return w.toLowerCase();
  });
  const joined = out.join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
