import { Svg, Rect, View, Text } from "@react-pdf/renderer";

import { PDF_COLORS as C, LAYOUT, PAGE } from "@/lib/pdf/theme";

/** Mesmo ícone (3 barras) de components/brand/logo.tsx, recriado com as
 * primitivas de SVG do @react-pdf/renderer (não é possível reaproveitar
 * o componente React/DOM original — o renderer de PDF usa seu próprio
 * conjunto de tags). */
export function PdfLogoIcon({ size = 20 }: { size?: number }) {
  const scale = size / 28;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Rect x={1 * scale} y={15 * scale} width={6 * scale} height={12 * scale} rx={1.5 * scale} fill={C.blueLight} />
      <Rect x={11 * scale} y={8 * scale} width={6 * scale} height={19 * scale} rx={1.5 * scale} fill={C.blue} />
      <Rect x={21 * scale} y={1 * scale} width={6 * scale} height={26 * scale} rx={1.5 * scale} fill={C.navy} />
    </Svg>
  );
}

/**
 * Cabeçalho institucional — fixo (se repete em toda página, sempre com
 * a mesma altura `LAYOUT.headerHeight`), compacto de propósito: logo +
 * nome do relatório à esquerda, período/emissão à direita. Os cards de
 * indicadores (quando existirem) NÃO ficam aqui — são conteúdo normal,
 * só aparecem uma vez na 1ª página (ver nota em surgeries-report-pdf).
 */
export function ReportHeader({
  title,
  subtitle,
  periodLabel,
  emittedAtLabel,
}: {
  title: string;
  subtitle: string;
  periodLabel: string;
  emittedAtLabel: string;
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
        height: LAYOUT.headerHeight,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottomWidth: 1.5,
        borderBottomColor: C.navy,
        paddingBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, maxWidth: 300 }}>
        <PdfLogoIcon size={24} />
        <View>
          <Text style={{ fontSize: 8, color: C.textMuted, letterSpacing: 0.5 }}>
            MEDFLOW | CIRURGIAS
          </Text>
          <Text style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 1 }}>{title}</Text>
          <Text style={{ fontSize: 8.5, color: C.textMuted, marginTop: 1 }}>{subtitle}</Text>
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontSize: 7.5, color: C.textMuted, letterSpacing: 0.5 }}>PERÍODO</Text>
        <Text style={{ fontSize: 9.5, color: C.textDark, fontWeight: 700, marginTop: 1 }}>{periodLabel}</Text>
        <Text style={{ fontSize: 7.5, color: C.textMuted, letterSpacing: 0.5, marginTop: 4 }}>EMITIDO EM</Text>
        <Text style={{ fontSize: 9.5, color: C.textDark, fontWeight: 700, marginTop: 1 }}>{emittedAtLabel}</Text>
      </View>
    </View>
  );
}

/** Rodapé institucional — fixo, com numeração "Página X de Y" calculada
 * pelo próprio @react-pdf/renderer via `render` (ele sabe, no momento de
 * desenhar cada página, quantas páginas o documento inteiro tem). */
export function ReportFooter() {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        bottom: PAGE.margin,
        left: PAGE.margin,
        right: PAGE.margin,
        height: LAYOUT.footerHeight,
        borderTopWidth: 0.75,
        borderTopColor: C.border,
        paddingTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 7.5, color: C.textMuted }}>Relatório gerado pelo MedFlow Cirurgias</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <PdfLogoIcon size={11} />
        <Text style={{ fontSize: 7.5, color: C.textMuted }}>MedFlow Cirurgias</Text>
      </View>
      <Text
        style={{ fontSize: 7.5, color: C.textMuted }}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

export type IndicatorTone = "neutral" | "amber" | "emerald" | "red" | "blue" | "gray";

const TONE_SOLID: Record<Exclude<IndicatorTone, "neutral">, string> = {
  amber: C.amber.solid,
  emerald: C.emerald.solid,
  red: C.red.solid,
  blue: C.blueBadge.solid,
  gray: C.gray.solid,
};

/** Card de indicador — "neutral" é o cartão branco simples (rótulo +
 * valor), igual ao "Total pago"/"Contas pagas" da referência; as outras
 * tonalidades são o cartão cheio de cor (igual "Banco"/"Cofre" da
 * referência) — usado pra destacar a métrica mais importante do grupo. */
export function IndicatorCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: IndicatorTone;
}) {
  if (tone === "neutral") {
    return (
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 4,
          padding: 10,
        }}
      >
        <Text style={{ fontSize: 7.5, color: C.textMuted, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
        <Text style={{ fontSize: 16, fontWeight: 700, color: C.textDark, marginTop: 4 }}>{value}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: TONE_SOLID[tone],
        borderRadius: 4,
        padding: 10,
      }}
    >
      <Text style={{ fontSize: 7.5, color: C.white, letterSpacing: 0.5, opacity: 0.9 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 14, fontWeight: 700, color: C.white, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

export function IndicatorCardRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>{children}</View>;
}

const BADGE_TONE: Record<Exclude<IndicatorTone, "neutral">, { bg: string; text: string }> = {
  amber: { bg: C.amber.bg, text: C.amber.text },
  emerald: { bg: C.emerald.bg, text: C.emerald.text },
  red: { bg: C.red.bg, text: C.red.text },
  blue: { bg: C.blueBadge.bg, text: C.blueBadge.text },
  gray: { bg: C.gray.bg, text: C.gray.text },
};

/** Etiqueta de status — fundo suave, texto legível, mesma semântica de
 * cor da tela (SCHEDULE_STATUS_COLOR). */
export function StatusBadge({ label, tone }: { label: string; tone: Exclude<IndicatorTone, "neutral"> }) {
  const { bg, text } = BADGE_TONE[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 8, color: text, fontWeight: 700 }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: 11, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{children}</Text>;
}
