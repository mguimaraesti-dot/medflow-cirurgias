/** Tipos compartilhados (servidor e cliente) da leitura de pedido cirúrgico por foto. */

/** Quão legível/seguro foi o trecho lido pela IA. */
export type Confidence = "high" | "medium" | "low";

export type RequestExtraction = {
  guide_type: "sp_sadt" | "internacao" | "outro";
  patient_name: string | null;
  patient_confidence: Confidence;
  clinical_indication: string | null;
  indication_confidence: Confidence;
  /** Texto do campo Observação/Justificativa da guia */
  observations: string | null;
  procedures: { tuss_code: string | null; description: string; confidence: Confidence }[];
  materials: {
    name: string;
    quantity: number | null;
    /** Marca / medida escritas */
    details: string | null;
    /** Fornecedor (opcional), informado pelo usuário na conferência */
    supplier: string | null;
    confidence: Confidence;
  }[];
  legibility_notes: string[];
};

export type ProcedureSuggestion = {
  key: string;
  read_code: string | null;
  read_description: string;
  confidence: Confidence;
  /**
   * exact = o código TUSS lido bate com um procedimento do catálogo (única forma de vincular sozinho);
   * suggested = só o nome parece: precisa de confirmação do usuário;
   * none = não há correspondência.
   */
  match: "exact" | "suggested" | "none";
  procedure: { id: string; name: string; tuss_code: string | null } | null;
  /** Possível correspondência por semelhança de nome (nunca aplicada sozinha). */
  suggestion: { id: string; name: string; tuss_code: string | null } | null;
  /** Nome oficial do código lido na TUSS 22 (para conferir a leitura) */
  tuss_official_name: string | null;
  /** O código lido não existe na TUSS 22 local (possível erro de leitura) */
  tuss_code_unknown: boolean;
  /** A descrição lida na guia não se parece com o nome oficial do código na TUSS (código ou texto possivelmente errado) */
  tuss_mismatch: boolean;
};

export type MaterialSuggestion = {
  key: string;
  source: "guide" | "kit";
  read_name: string;
  confidence: Confidence;
  quantity: number;
  details: string | null;
  /** Fornecedor digitado pelo usuário e, se existir no cadastro, o fornecedor correspondente */
  supplier_text: string | null;
  supplier: { id: string; name: string } | null;
  /** Só preenchido quando o nome é igual ao do catálogo (ou vem do kit padrão). */
  material: { id: string; name: string } | null;
  /** Materiais do catálogo parecidos: sugestões que o usuário escolhe manualmente. */
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
  indication_confidence: Confidence;
  observations: string | null;
  patient: PatientSuggestion & { confidence: Confidence };
  procedures: ProcedureSuggestion[];
  materials: MaterialSuggestion[];
  legibility_notes: string[];
};
