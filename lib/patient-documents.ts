/** Regras compartilhadas (cliente + servidor) dos documentos do paciente. */

export const PATIENT_DOCUMENTS_BUCKET = "patient-documents";

/** Mesmo limite dos anexos da cirurgia e do bucket (migração 0023). */
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export const DOCUMENT_CATEGORIES = [
  { value: "identity", label: "Documento de identificação (RG/CNH)" },
  { value: "cpf", label: "CPF" },
  { value: "insurance_card", label: "Carteirinha do convênio" },
  { value: "medical_request", label: "Pedido médico" },
  { value: "exams", label: "Exames" },
  { value: "medical_findings", label: "Laudos médicos" },
  { value: "medical_reports", label: "Relatórios médicos" },
  { value: "other", label: "Outros documentos" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_CATEGORIES.map((c) => [c.value, c.label])
);

export function isDocumentCategory(v: unknown): v is DocumentCategory {
  return DOCUMENT_CATEGORIES.some((c) => c.value === v);
}

/** extensão -> MIME aceito */
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** MIME canônico para a extensão, ou null se o formato não é permitido. */
export function mimeForName(name: string): string | null {
  return ALLOWED[extensionOf(name)] ?? null;
}

export function formatLabel(name: string): string {
  const ext = extensionOf(name);
  return ext === "jpeg" ? "JPG" : ext.toUpperCase();
}

/** Valida nome/tamanho/tipo declarados (sem ler o conteúdo). Retorna a mensagem de erro, se houver. */
export function validateDocumentMeta(meta: { name: string; size: number; type?: string }): string | null {
  const mime = mimeForName(meta.name);
  if (!mime) return `"${meta.name}": formato não permitido. Use PDF, JPG ou PNG.`;
  if (meta.type && meta.type !== mime && !(mime === "image/jpeg" && meta.type === "image/jpg")) {
    return `"${meta.name}": o tipo do arquivo não confere com a extensão.`;
  }
  if (meta.size <= 0) return `"${meta.name}": arquivo vazio.`;
  if (meta.size > MAX_DOCUMENT_BYTES) {
    return `"${meta.name}": muito grande (máximo ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB).`;
  }
  return null;
}

/** Confere os primeiros bytes (assinatura) com o MIME esperado. */
export function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  const startsWith = (sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (mime === "application/pdf") return startsWith([0x25, 0x50, 0x44, 0x46]); // %PDF
  if (mime === "image/png") return startsWith([0x89, 0x50, 0x4e, 0x47]);
  if (mime === "image/jpeg") return startsWith([0xff, 0xd8, 0xff]);
  return false;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function sanitizeFileName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
}
