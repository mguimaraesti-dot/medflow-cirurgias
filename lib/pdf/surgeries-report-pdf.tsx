import { Document, Page, View, Text } from "@react-pdf/renderer";

import type { ScheduleSurgeryItem } from "@/lib/data/surgeries";
import { deriveScheduleStatus, SCHEDULE_STATUS_LABEL, type ScheduleStatus } from "@/lib/schedule-status";
import { PDF_COLORS as C, LAYOUT, PAGE } from "@/lib/pdf/theme";
import { paginateRows } from "@/lib/pdf/paginate";
import {
  ReportHeader,
  ReportFooter,
  IndicatorCard,
  IndicatorCardRow,
  StatusBadge,
  type IndicatorTone,
} from "@/lib/pdf/components";

/** Mesma semântica de cor já usada na Agenda/Mapa Cirúrgico
 * (lib/schedule-status.ts), só mapeada pro tom usado nos componentes de
 * PDF (sem classes Tailwind). */
const STATUS_TONE: Record<ScheduleStatus, Exclude<IndicatorTone, "neutral">> = {
  prevista: "amber",
  confirmada: "emerald",
  atrasada: "red",
  realizada: "blue",
  cancelada: "gray",
  sem_data: "gray",
};

const COLUMNS: { key: string; label: string; flex: number; align?: "right" | "center" }[] = [
  { key: "code", label: "Código", flex: 1.15 },
  { key: "patient", label: "Paciente", flex: 1.75 },
  { key: "hospital", label: "Hospital", flex: 1.25 },
  { key: "procedure", label: "Procedimento", flex: 1.85 },
  { key: "attendance", label: "Atendimento", flex: 1.35 },
  { key: "date", label: "Data", flex: 0.85, align: "center" },
  { key: "time", label: "Horário", flex: 0.65, align: "center" },
  { key: "status", label: "Status", flex: 1.3, align: "center" },
];

/**
 * Estimativa de quantas linhas uma célula de texto vai ocupar, baseada
 * na largura real da coluna (em pt) — necessária porque "Paciente" e
 * "Procedimento" frequentemente quebram em 2-3 linhas com nomes/termos
 * longos (comum em nomes de pacientes e nomenclatura de procedimentos
 * cirúrgicos). Calibrado visualmente contra a renderização real do
 * @react-pdf/renderer (fonte Helvetica 8pt); erra propositalmente para
 * cima (estima largura média de caractere maior / menos caracteres por
 * linha) pra nunca subestimar a altura e arriscar estourar a página.
 */
const TABLE_CONTENT_WIDTH =
  PAGE.width - PAGE.margin * 2 - 8 /* paddingHorizontal da linha */;
const COLUMNS_FLEX_TOTAL = COLUMNS.reduce((sum, col) => sum + col.flex, 0);
const AVG_CHAR_WIDTH_PT = 4.3; // Helvetica 8pt, texto em pt-BR (acentos inclusos)
const LINE_HEIGHT_PT = 10.5;
const ROW_VERTICAL_PADDING_PT = 10; // paddingVertical: 5 em cima + 5 embaixo

function columnWidthPt(flex: number) {
  return (flex / COLUMNS_FLEX_TOTAL) * TABLE_CONTENT_WIDTH - 8; // menos padding da célula (4 + 4)
}

function estimateLines(text: string, columnFlex: number) {
  const width = columnWidthPt(columnFlex);
  const charsPerLine = Math.max(6, Math.floor(width / AVG_CHAR_WIDTH_PT));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

const PATIENT_FLEX = COLUMNS.find((c) => c.key === "patient")!.flex;
const PROCEDURE_FLEX = COLUMNS.find((c) => c.key === "procedure")!.flex;
const HOSPITAL_FLEX = COLUMNS.find((c) => c.key === "hospital")!.flex;
const ATTENDANCE_FLEX = COLUMNS.find((c) => c.key === "attendance")!.flex;

export function estimateRowHeight(row: ScheduleSurgeryItem): number {
  const procedureLabel =
    (row.primary_procedure?.name ?? "—") + (row.procedures.length > 1 ? ` +${row.procedures.length - 1}` : "");
  const lines = Math.max(
    estimateLines(row.patient?.full_name ?? "—", PATIENT_FLEX),
    estimateLines(procedureLabel, PROCEDURE_FLEX),
    estimateLines(row.hospital?.name ?? "—", HOSPITAL_FLEX),
    estimateLines(attendanceLabel(row), ATTENDANCE_FLEX)
  );
  return Math.max(LAYOUT.tableRowHeight, lines * LINE_HEIGHT_PT + ROW_VERTICAL_PADDING_PT);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 5);
}

function attendanceLabel(row: ScheduleSurgeryItem) {
  return row.attendance_type === "particular" ? "Particular" : (row.insurance_provider?.name ?? "Convênio");
}

function TableHeaderRow() {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: C.navy,
        paddingVertical: 5,
        paddingHorizontal: 4,
      }}
    >
      {COLUMNS.map((col) => (
        <Text
          key={col.key}
          style={{
            flex: col.flex,
            fontSize: 7.5,
            fontWeight: 700,
            color: C.white,
            textAlign: col.align ?? "left",
            letterSpacing: 0.3,
            paddingHorizontal: 4,
          }}
        >
          {col.label.toUpperCase()}
        </Text>
      ))}
    </View>
  );
}

function TableDataRow({ row, index }: { row: ScheduleSurgeryItem; index: number }) {
  const scheduleStatus = deriveScheduleStatus(row);
  const procedureLabel =
    (row.primary_procedure?.name ?? "—") + (row.procedures.length > 1 ? ` +${row.procedures.length - 1}` : "");

  const cellByKey: Record<string, React.ReactNode> = {
    code: row.code,
    patient: row.patient?.full_name ?? "—",
    hospital: row.hospital?.name ?? "—",
    procedure: procedureLabel,
    attendance: attendanceLabel(row),
    date: formatDate(row.confirmed_date ?? row.expected_date),
    time: formatTime(row.confirmed_time),
    status: <StatusBadge label={SCHEDULE_STATUS_LABEL[scheduleStatus]} tone={STATUS_TONE[scheduleStatus]} />,
  };

  return (
    <View
      wrap={false}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        paddingHorizontal: 4,
        backgroundColor: index % 2 === 1 ? C.rowStripe : C.white,
        borderBottomWidth: 0.5,
        borderBottomColor: C.border,
        minHeight: LAYOUT.tableRowHeight,
      }}
    >
      {COLUMNS.map((col) => {
        const content = cellByKey[col.key];
        if (col.key === "status") {
          return (
            <View key={col.key} style={{ flex: col.flex, alignItems: col.align === "center" ? "center" : "flex-start" }}>
              {content}
            </View>
          );
        }
        return (
          <Text
            key={col.key}
            style={{
              flex: col.flex,
              fontSize: 8,
              color: C.textDark,
              textAlign: col.align ?? "left",
              paddingHorizontal: 4,
            }}
          >
            {content}
          </Text>
        );
      })}
    </View>
  );
}

export type SurgeriesReportCounts = {
  total: number;
  prevista: number;
  confirmada: number;
  realizada: number;
  cancelada: number;
  atrasada: number;
};

export function computeSurgeriesReportCounts(rows: ScheduleSurgeryItem[]): SurgeriesReportCounts {
  const counts: SurgeriesReportCounts = {
    total: rows.length,
    prevista: 0,
    confirmada: 0,
    realizada: 0,
    cancelada: 0,
    atrasada: 0,
  };
  for (const row of rows) {
    const status = deriveScheduleStatus(row);
    if (status === "sem_data") continue;
    counts[status] += 1;
  }
  return counts;
}

/**
 * Relatório de Cirurgias em PDF — cabeçalho e rodapé institucionais se
 * repetem em toda página; os cards de indicadores aparecem só na 1ª
 * página (não fazem sentido repetidos, são o resumo do período inteiro);
 * o cabeçalho da tabela se repete em toda página porque cada "pedaço" do
 * conjunto de linhas é desenhado como uma página explícita própria (ver
 * lib/pdf/paginate.ts) — garante que nenhuma linha é cortada ao meio e
 * que não sobra página em branco.
 */
export function SurgeriesReportPdf({
  rows,
  counts,
  periodLabel,
  emittedAtLabel,
}: {
  rows: ScheduleSurgeryItem[];
  counts: SurgeriesReportCounts;
  periodLabel: string;
  emittedAtLabel: string;
}) {
  // Altura aproximada ocupada só na 1ª página pela linha única de
  // cards de indicadores (card + espaçamento) — entra na conta de
  // quantas linhas cabem ali, pra não estourar a página.
  const CARDS_HEIGHT = 52 + 8;
  const pages = paginateRows(rows, estimateRowHeight, CARDS_HEIGHT);

  return (
    <Document title="Relatório de Cirurgias — MedFlow Cirurgias">
      {pages.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" style={{ paddingHorizontal: PAGE.margin, paddingVertical: PAGE.margin, fontFamily: "Helvetica" }}>
          <ReportHeader
            title="Relatório de Cirurgias"
            subtitle="Cirurgias do período, com status, hospital e atendimento"
            periodLabel={periodLabel}
            emittedAtLabel={emittedAtLabel}
          />

          <View style={{ marginTop: LAYOUT.headerHeight + 10 }}>
            {pageIndex === 0 ? (
              <>
                <IndicatorCardRow>
                  <IndicatorCard label="Total" value={String(counts.total)} />
                  <IndicatorCard label="Previstas" value={String(counts.prevista)} tone="amber" />
                  <IndicatorCard label="Confirmadas" value={String(counts.confirmada)} tone="emerald" />
                  <IndicatorCard label="Realizadas" value={String(counts.realizada)} tone="blue" />
                  <IndicatorCard label="Canceladas" value={String(counts.cancelada)} tone="gray" />
                  <IndicatorCard label="Atrasadas" value={String(counts.atrasada)} tone="red" />
                </IndicatorCardRow>
              </>
            ) : null}

            <TableHeaderRow />
            {chunk.length === 0 && rows.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ fontSize: 9, color: C.textMuted }}>
                  Nenhuma cirurgia encontrada para o período e os filtros selecionados.
                </Text>
              </View>
            ) : (
              chunk.map((row, i) => <TableDataRow key={row.id} row={row} index={i} />)
            )}
          </View>

          <ReportFooter />
        </Page>
      ))}
    </Document>
  );
}
