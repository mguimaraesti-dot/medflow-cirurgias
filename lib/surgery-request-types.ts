/** Tipos compartilhados (servidor e cliente) da leitura de pedido cirúrgico por foto. */

export type RequestExtraction = {
  guide_type: "sp_sadt" | "internacao" | "outro";
  patient_name: string | null;
  clinical_indication: string | null;
  procedures: { tuss_code: string | null; description: string }[];
  materials: { name: string; quantity: number | null; details: string | null }[];
  legibility_notes: string[];
};

export type ProcedureSuggestion = {
  key: string;
  read_code: string | null;
  read_description: string;
  /** exact = código TUSS bate com o cadastro; similar = só o nome parece; none = não achou */
  match: "exact" | "similar" | "none";
  procedure: { id: string; name: string; tuss_code: string | null } | null;
  /** Nome oficial do código lido na TUSS 22 (para conferir a leitura) */
  tuss_official_name: string | null;
  /** O código lido não existe na TUSS 22 local (possível erro de leitura) */
  tuss_code_unknown: boolean;
};

export type MaterialSuggestion = {
  key: string;
  source: "guide" | "kit";
  read_name: string;
  quantity: number;
  details: string | null;
  material: { id: string; name: string } | null;
  /** Outros materiais do catálogo parecidos (quando não há correspondência certa) */
  alternatives: { id: string; name: string }[];
};

export type PatientSuggestion = {
  read_name: string | null;
  match: "exact" | "similar" | "none";
  patient: { id: string; full_name: string } | null;
  alternatives: { id: string; full_name: string }[];
};

export type RequestAnalysis = {
  guide_type: RequestExtraction["guide_type"];
  clinical_indication: string | null;
  patient: PatientSuggestion;
  procedures: ProcedureSuggestion[];
  materials: MaterialSuggestion[];
  legibility_notes: string[];
};
