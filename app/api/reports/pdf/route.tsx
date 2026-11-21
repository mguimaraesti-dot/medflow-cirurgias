import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { createClient } from "@/lib/supabase/server";
import { getSurgeriesReport } from "@/lib/data/reports";
import { SurgeriesReportPdf, computeSurgeriesReportCounts } from "@/lib/pdf/surgeries-report-pdf";

function formatDateLabel(value: string) {
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const type = params.get("type") ?? "cirurgias";
  const from = params.get("from");
  const to = params.get("to");
  const hospitalId = params.get("hospital") ?? undefined;
  const status = params.get("status") ?? undefined;

  if (!from || !to) {
    return new Response("Período (from/to) é obrigatório.", { status: 400 });
  }

  // Só o relatório de Cirurgias tem o novo layout em PDF por enquanto —
  // Financeiro e Produtividade continuam usando "Imprimir / PDF" do
  // navegador até serem adaptados numa próxima leva.
  if (type !== "cirurgias") {
    return new Response("Exportação em PDF ainda não disponível para este relatório.", { status: 400 });
  }

  const rows = await getSurgeriesReport(supabase, { from, to, hospitalId, status });
  const counts = computeSurgeriesReportCounts(rows);

  const periodLabel = `${formatDateLabel(from)} a ${formatDateLabel(to)}`;
  const emittedAtLabel = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", " às");

  const buffer = await renderToBuffer(
    <SurgeriesReportPdf rows={rows} counts={counts} periodLabel={periodLabel} emittedAtLabel={emittedAtLabel} />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cirurgias_${from}_a_${to}.pdf"`,
    },
  });
}
