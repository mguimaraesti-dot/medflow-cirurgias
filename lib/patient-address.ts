import { formatCep } from "@/lib/br-format";

/**
 * Endereço do paciente. A coluna `patients.address` é jsonb: cadastros
 * antigos guardam só um texto ("Rua X, 100"); os novos guardam este objeto.
 * Os dois formatos são lidos aqui — nada é migrado nem apagado.
 */
export type PatientAddress = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const EMPTY_ADDRESS: PatientAddress = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function parseAddress(raw: unknown): PatientAddress {
  if (typeof raw === "string") return { ...EMPTY_ADDRESS, street: raw };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const pick = (k: keyof PatientAddress) => (typeof o[k] === "string" ? (o[k] as string) : "");
    return {
      cep: pick("cep"),
      street: pick("street"),
      number: pick("number"),
      complement: pick("complement"),
      neighborhood: pick("neighborhood"),
      city: pick("city"),
      state: pick("state"),
    };
  }
  return { ...EMPTY_ADDRESS };
}

export function isEmptyAddress(a: PatientAddress) {
  return Object.values(a).every((v) => v.trim() === "");
}

/** "Rua X, 100 - Compl - Bairro - Cidade/UF - CEP 00000-000" */
export function formatAddress(raw: unknown): string {
  const a = parseAddress(raw);
  const street = [a.street, a.number].map((s) => s.trim()).filter(Boolean).join(", ");
  const cityUf = [a.city.trim(), a.state.trim()].filter(Boolean).join("/");
  const cep = a.cep.trim() ? `CEP ${formatCep(a.cep)}` : "";
  return [street, a.complement.trim(), a.neighborhood.trim(), cityUf, cep].filter(Boolean).join(" - ");
}
