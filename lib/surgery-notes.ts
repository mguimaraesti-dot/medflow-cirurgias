/**
 * O texto das notas da cirurgia (admin_notes) pode conter, além das
 * observações internas, os blocos "Indicação clínica: …" e "Observações da
 * guia: …" inseridos pela leitura da guia / digitados no formulário. Esta
 * função apenas SEPARA esses blocos para exibição; nada é reescrito ou
 * descartado (o texto original permanece intacto no banco).
 */
export type ParsedSurgeryNotes = {
  indication: string | null;
  guideObservations: string | null;
  other: string | null;
};

const MARKERS = [
  { key: "indication", re: /^\s*Indica[çc][ãa]o cl[íi]nica\s*:\s*/i },
  { key: "guideObservations", re: /^\s*Observa[çc][õo]es da guia\s*:\s*/i },
] as const;

export function parseSurgeryNotes(notes: string | null | undefined): ParsedSurgeryNotes {
  const result: Record<"indication" | "guideObservations" | "other", string[]> = {
    indication: [],
    guideObservations: [],
    other: [],
  };
  let current: "indication" | "guideObservations" | "other" = "other";
  for (const line of (notes ?? "").split(/\r?\n/)) {
    const marker = MARKERS.find((m) => m.re.test(line));
    if (marker) {
      current = marker.key;
      result[current].push(line.replace(marker.re, ""));
    } else {
      result[current].push(line);
    }
  }
  const clean = (lines: string[]) => lines.join("\n").trim() || null;
  return {
    indication: clean(result.indication),
    guideObservations: clean(result.guideObservations),
    other: clean(result.other),
  };
}
