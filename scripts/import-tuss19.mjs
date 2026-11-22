#!/usr/bin/env node
/**
 * Importa/atualiza a cópia local da TUSS 19 (materiais e OPME) no Supabase.
 *
 * Uso (na pasta do projeto, com .env.local preenchido):
 *   node --env-file=.env.local scripts/import-tuss19.mjs <arquivo.zip | pasta-com-csvs> [--all] [--prune] [--dry-run]
 *
 *   --all      importa a tabela inteira (só cabe no plano Pro do Supabase)
 *   --prune    remove da cópia os códigos que sumiram da tabela nova
 *   --dry-run  só lê e conta, sem gravar no banco
 *
 * Baixe o ZIP da TUSS 19 no portal da ANS/ TUSS e rode de novo de tempos em
 * tempos (a importação é segura de repetir: atualiza por código).
 * Usa a chave de serviço do Supabase: rode só no seu computador, nunca na Vercel.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse";
import yauzl from "yauzl";
import { createClient } from "@supabase/supabase-js";

import { TUSS19_PATTERN } from "./tuss19-filter.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const input = args.find((a) => !a.startsWith("--"));
if (!input) {
  console.error("Informe o .zip ou a pasta com os CSVs da TUSS 19.");
  process.exit(1);
}
const ALL = flags.has("--all");
const DRY = flags.has("--dry-run");
const PRUNE = flags.has("--prune");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DRY && (!url || !key)) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}
const supabase = DRY ? null : createClient(url, key, { auth: { persistSession: false } });

const normalize = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/;/g, ";"); // ponto-e-vírgula grego vindo da fonte
}
const clean = (v) => {
  const t = (v ?? "").replace(/ /g, " ").trim();
  return !t || t === "-" || t.toUpperCase() === "NÃO SE APLICA" ? null : t;
};
const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test((v ?? "").trim()) ? v.trim() : null);

function toRow(r, syncedAt) {
  const code = (r.id ?? "").trim();
  const name = decodeEntities(r.display_name ?? "").replace(/\s+/g, " ").trim();
  if (!code || !name) return null;
  const searchText = normalize(name);
  if (!ALL && !TUSS19_PATTERN.test(searchText)) return null;
  let model = clean(r.extras_modelo);
  // O modelo costuma vir repetido no fim do nome: não guardar duas vezes.
  if (model && name.endsWith(model)) model = null;
  return {
    table_name: "tuss-19",
    code,
    name,
    search_text: searchText,
    start_date: date(r.extras_inicio_vigencia),
    end_date: date(r.extras_fim_vigencia),
    manufacturer: clean(r.extras_fabricante),
    model,
    anvisa_registration: clean(r.extras_registro_anvisa),
    risk_class: clean(r.extras_classe_risco),
    synced_at: syncedAt,
  };
}

/** Lê cada CSV (de um zip ou de uma pasta) como stream. */
async function* csvStreams(src) {
  if (fs.statSync(src).isDirectory()) {
    for (const f of fs.readdirSync(src).filter((n) => n.toLowerCase().endsWith(".csv")).sort()) {
      yield { name: f, stream: fs.createReadStream(path.join(src, f)) };
    }
    return;
  }
  const zip = await new Promise((res, rej) => yauzl.open(src, { lazyEntries: true }, (e, z) => (e ? rej(e) : res(z))));
  const next = () =>
    new Promise((res, rej) => {
      const onEntry = (entry) => {
        cleanup();
        res(entry);
      };
      const onEnd = () => {
        cleanup();
        res(null);
      };
      const onErr = (e) => {
        cleanup();
        rej(e);
      };
      const cleanup = () => {
        zip.off("entry", onEntry);
        zip.off("end", onEnd);
        zip.off("error", onErr);
      };
      zip.on("entry", onEntry);
      zip.on("end", onEnd);
      zip.on("error", onErr);
      zip.readEntry();
    });
  for (let entry = await next(); entry; entry = await next()) {
    if (!entry.fileName.toLowerCase().endsWith(".csv")) continue;
    const stream = await new Promise((res, rej) => zip.openReadStream(entry, (e, s) => (e ? rej(e) : res(s))));
    yield { name: entry.fileName, stream };
  }
  zip.close();
}

const BATCH = 1000;
let buffer = [];
let read = 0;
let kept = 0;
let saved = 0;
const seen = new Set();
const syncedAt = new Date().toISOString();

async function flush() {
  if (buffer.length === 0 || DRY) {
    buffer = [];
    return;
  }
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.from("tuss_terms").upsert(buffer, { onConflict: "table_name,code" });
    if (!error) break;
    if (attempt >= 3) throw error;
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  saved += buffer.length;
  buffer = [];
}

console.log(`Importando TUSS 19 (${ALL ? "tabela completa" : "filtro de endoscopia"})${DRY ? " — simulação" : ""}…`);
if (!DRY) {
  await supabase.from("tuss_sync_state").update({ status: "running" }).eq("table_name", "tuss-19");
}

for await (const { name, stream } of csvStreams(input)) {
  const parser = stream.pipe(
    parse({
      delimiter: ";",
      quote: '"',
      escape: "\\", // as aspas dentro dos campos vêm escapadas com barra invertida
      columns: true,
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
    })
  );
  for await (const record of parser) {
    read++;
    const row = toRow(record, syncedAt);
    if (!row || seen.has(row.code)) continue;
    seen.add(row.code);
    kept++;
    buffer.push(row);
    if (buffer.length >= BATCH) await flush();
  }
  process.stdout.write(`  ${name}: ${read.toLocaleString("pt-BR")} lidos, ${kept.toLocaleString("pt-BR")} mantidos\r`);
}
await flush();
console.log(`\nLidos: ${read.toLocaleString("pt-BR")} · mantidos: ${kept.toLocaleString("pt-BR")} · gravados: ${saved.toLocaleString("pt-BR")}`);

if (!DRY) {
  if (PRUNE) {
    const { error, count } = await supabase
      .from("tuss_terms")
      .delete({ count: "exact" })
      .eq("table_name", "tuss-19")
      .lt("synced_at", syncedAt);
    if (error) throw error;
    console.log(`Removidos da cópia (não estão mais na tabela): ${count ?? 0}`);
  }
  await supabase
    .from("tuss_sync_state")
    .update({ status: "done", last_synced_at: new Date().toISOString(), last_page: 0 })
    .eq("table_name", "tuss-19");
  const { count } = await supabase
    .from("tuss_terms")
    .select("code", { count: "exact", head: true })
    .eq("table_name", "tuss-19");
  console.log(`Cópia local da TUSS 19 agora tem ${(count ?? 0).toLocaleString("pt-BR")} códigos.`);
}
