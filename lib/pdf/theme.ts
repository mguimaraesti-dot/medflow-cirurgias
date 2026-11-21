/**
 * Paleta/medidas dos relatórios em PDF (@react-pdf/renderer não entende
 * classes do Tailwind nem variáveis CSS — precisa de valores literais).
 * Os tons seguem a mesma semântica já usada na aplicação
 * (lib/schedule-status.ts, components/brand/logo.tsx), só traduzida pra
 * hex, pra qualquer relatório em PDF ter a mesma identidade visual da
 * tela.
 */
export const PDF_COLORS = {
  navy: "#1E3A8A",
  blue: "#2563EB",
  blueLight: "#60A5FA",
  textDark: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  rowStripe: "#F8FAFC",
  white: "#FFFFFF",
  amber: { solid: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  emerald: { solid: "#10B981", bg: "#D1FAE5", text: "#065F46" },
  red: { solid: "#EF4444", bg: "#FEE2E2", text: "#991B1B" },
  blueBadge: { solid: "#3B82F6", bg: "#DBEAFE", text: "#1E40AF" },
  gray: { solid: "#94A3B8", bg: "#F1F5F9", text: "#475569" },
} as const;

/** Página A4 em pt (unidade nativa do @react-pdf/renderer). */
export const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 32,
};

export const LAYOUT = {
  headerHeight: 70,
  footerHeight: 34,
  tableHeaderRowHeight: 20,
  /** Altura média estimada por linha de tabela — conservadora de
   * propósito (ver nota em lib/pdf/paginate.ts) pra nunca estourar a
   * página mesmo quando uma célula quebra em 2 linhas. */
  tableRowHeight: 22,
};
