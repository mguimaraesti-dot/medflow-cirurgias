import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { getSurgeriesReport, getFinancialReport, getProductivityReport } from "@/lib/data/reports";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  rescheduled: "Reagendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value + "T00:00:00").toLocaleDateString("pt-BR");
}

function csvEscape(value: string) {
  if (/[",;\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map((h) => csvEscape(h)).join(";")];
  for (const row of rows) {
    lines.push(row.map((v) => csvEscape(String(v))).join(";"));
  }
  // BOM no início pra acentuação abrir certo quando importado no Excel.
  return "﻿" + lines.join("\n");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return new Response("Não autenticado.", { status: 401 });
  }
  const user = await getCurrentUser();
  if (!(await hasPermission(user, "reports", "view"))) {
    return new Response("Sem permissão para exportar relatórios.", { status: 403 });
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

  let csv: string;
  let filename: string;

  if (type === "financeiro") {
    const { rows } = await getFinancialReport(supabase, { from, to, hospitalId });
    csv = toCsv(
      ["Cirurgia", "Paciente", "Hospital", "Data", "Valor acordado", "Recebido", "Saldo"],
      rows.map((r) => {
        const expected = r.agreed_value ?? r.expected_value ?? 0;
        return [
          r.surgery?.code ?? "",
          r.surgery?.patient?.full_name ?? "",
          r.surgery?.hospital?.name ?? "",
          formatDate(r.surgery?.confirmed_date ?? r.surgery?.expected_date ?? null),
          expected,
          r.received_value,
          expected - r.received_value,
        ];
      })
    );
    filename = `financeiro_${from}_a_${to}.csv`;
  } else if (type === "produtividade") {
    const buckets = await getProductivityReport(supabase, { from, to });
    csv = toCsv(
      ["Mês", "Cirurgias realizadas"],
      buckets.map((b) => [b.label, b.count])
    );
    filename = `produtividade_${from}_a_${to}.csv`;
  } else {
    const rows = await getSurgeriesReport(supabase, { from, to, hospitalId, status });
    csv = toCsv(
      ["Código", "Paciente", "Hospital", "Procedimento", "Atendimento", "Status", "Data"],
      rows.map((r) => [
        r.code,
        r.patient?.full_name ?? "",
        r.hospital?.name ?? "",
        r.primary_procedure?.name ?? "",
        r.attendance_type === "particular" ? "Particular" : r.insurance_provider?.name ?? "Convênio",
        STATUS_LABEL[r.status] ?? r.status,
        formatDate(r.confirmed_date ?? r.expected_date),
      ])
    );
    filename = `cirurgias_${from}_a_${to}.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
