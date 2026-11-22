import type { SupabaseClient } from "@supabase/supabase-js";

import type { TussResult, TussTable } from "@/lib/tuss";
import { normalizeTussText } from "@/lib/tuss";

type Row = {
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  manufacturer: string | null;
  model: string | null;
  anvisa_registration: string | null;
  risk_class: string | null;
};

const COLUMNS = "code,name,start_date,end_date,manufacturer,model,anvisa_registration,risk_class";

function isActive(row: Row, today: string): boolean {
  if (row.start_date && row.start_date > today) return false;
  if (row.end_date && row.end_date < today) return false;
  return true;
}

function toResult(row: Row, today: string): TussResult {
  return {
    code: row.code,
    name: row.name,
    active: isActive(row, today),
    manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? undefined,
    anvisaRegistration: row.anvisa_registration ?? undefined,
    riskClass: row.risk_class ?? undefined,
  };
}

/** "clipes" → "clip", "próteses" → "protes": acha o termo no singular também. */
function singular(token: string): string {
  if (token.length > 5 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

/** A cópia local já foi carregada pelo menos uma vez? */
export async function hasLocalTuss(supabase: SupabaseClient, table: TussTable): Promise<boolean> {
  // Só precisa saber se existe ao menos 1 linha (contar tudo seria lento na TUSS 19).
  const { data, error } = await supabase.from("tuss_terms").select("code").eq("table_name", table).limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

/**
 * Busca na cópia local. Cada palavra digitada precisa aparecer no nome
 * (ignora acento e caixa); se só tem dígitos, procura pelo código.
 * Devolve `null` se a cópia local não existe/está vazia (quem chama usa a
 * consulta ao vivo à ANS como reserva).
 */
export async function searchLocalTuss(
  supabase: SupabaseClient,
  table: TussTable,
  query: string,
  today: string
): Promise<TussResult[] | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  if (!(await hasLocalTuss(supabase, table))) return null;

  let q = supabase.from("tuss_terms").select(COLUMNS).eq("table_name", table);

  if (/^\d+$/.test(trimmed)) {
    q = q.like("code", `${trimmed}%`);
  } else {
    const tokens = normalizeTussText(trimmed)
      .split(/\s+/)
      .filter((t) => t.length >= 2)
      .map(singular);
    for (const token of tokens) {
      // escapa os curingas do LIKE digitados pelo usuário
      const safe = token.replace(/[\\%_]/g, (c) => `\\${c}`);
      q = q.like("search_text", `%${safe}%`);
    }
  }

  const { data, error } = await q.limit(200);
  if (error) throw error;

  const normalizedQuery = normalizeTussText(trimmed);
  const rows = (data ?? []) as Row[];
  return rows
    .map((row) => {
      const name = normalizeTussText(row.name);
      let score = 0;
      if (name === normalizedQuery) score += 2000;
      if (name.startsWith(normalizedQuery)) score += 500;
      if (name.includes(normalizedQuery)) score += 1000;
      if (isActive(row, today)) score += 5;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name, "pt-BR"))
    .slice(0, 30)
    .map(({ row }) => toResult(row, today));
}
