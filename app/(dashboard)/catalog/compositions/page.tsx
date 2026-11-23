import Link from "next/link";
import { ChevronRight, FileText, Layers, Search, Star } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { listAllCompositions, type CompositionListItem } from "@/lib/data/compositions";
import { formatCompositionCode } from "@/lib/compositions/signature";
import { normalizeText } from "@/lib/data/fetch-all";
import { cn } from "@/lib/utils";
import { CompositionCatalog, type CatalogRow, type SortKey } from "@/components/compositions/composition-catalog";

const PAGE_SIZE = 20;
type Filter = "all" | "top" | "recent";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function matches(c: CompositionListItem, q: string): boolean {
  if (!q) return true;
  const code = formatCompositionCode(c.number);
  const digits = q.replace(/\D/g, "");
  if (/^cmp/i.test(q) || /^\d+$/.test(q)) {
    if (normalizeText(code).includes(normalizeText(q))) return true;
    if (digits && c.number === Number(digits)) return true;
  }
  const hay = [
    code,
    c.name,
    ...c.procedures.flatMap((p) => [p.tuss_code ?? "", p.name]),
    ...c.materials.flatMap((m) => [m.tuss_code ?? "", m.name]),
  ].map(normalizeText);
  const needle = normalizeText(q);
  return hay.some((h) => h.includes(needle));
}

export default async function CompositionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireModuleView("procedures");
  const sp = await searchParams;
  const q = (first(sp.q) ?? "").trim().slice(0, 80);
  const filter: Filter = first(sp.filter) === "top" ? "top" : first(sp.filter) === "recent" ? "recent" : "all";
  const sort: SortKey = first(sp.sort) === "code" ? "code" : first(sp.sort) === "uses" ? "uses" : "date";
  const defaultDir = sort === "code" ? "asc" : "desc";
  const dir: "asc" | "desc" = first(sp.dir) === "asc" ? "asc" : first(sp.dir) === "desc" ? "desc" : defaultDir;
  const principal = first(sp.principal) ?? "";
  const requestedPage = Math.max(1, Number(first(sp.page)) || 1);

  const supabase = await createClient();
  const user = await getCurrentUser();
  const canEdit = user ? await hasPermission(user, "procedures", "edit") : false;

  let all: CompositionListItem[] = [];
  let unavailable = false;
  try {
    all = await listAllCompositions(supabase);
  } catch {
    unavailable = true;
  }

  // Indicadores (sobre o catálogo inteiro, independente da busca)
  const totalGuides = all.reduce((n, c) => n + c.surgeries.length, 0);
  const mostUsed = [...all].sort((a, b) => b.surgeries.length - a.surgeries.length)[0];

  // Procedimentos principais disponíveis para o filtro
  const principals = new Map<string, string>();
  for (const c of all) {
    const p = c.procedures.find((x) => x.is_primary);
    if (p) principals.set(p.id, p.name);
  }
  const principalOptions = [...principals.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));

  let list = all.filter((c) => matches(c, q));
  if (principal) list = list.filter((c) => c.procedures.some((p) => p.is_primary && p.id === principal));
  if (filter === "top") list = list.filter((c) => c.surgeries.length > 0);

  const effectiveSort: SortKey = filter === "top" && !first(sp.sort) ? "uses" : filter === "recent" && !first(sp.sort) ? "date" : sort;
  const effectiveDir = first(sp.dir) ? dir : effectiveSort === "code" ? "asc" : "desc";
  const sign = effectiveDir === "asc" ? 1 : -1;
  list.sort((a, b) => {
    const base =
      effectiveSort === "code"
        ? a.number - b.number
        : effectiveSort === "uses"
          ? a.surgeries.length - b.surgeries.length
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return base * sign || b.number - a.number;
  });

  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rows: CatalogRow[] = pageRows.map((c) => ({
    id: c.id,
    number: c.number,
    name: c.name,
    primary_name: c.procedures.find((p) => p.is_primary)?.name ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
    procedures: c.procedures,
    materials: c.materials,
    surgeries: c.surgeries,
  }));

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      filter: filter === "all" ? undefined : filter,
      sort: first(sp.sort),
      dir: first(sp.dir),
      principal: principal || undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/catalog/compositions${qs ? `?${qs}` : ""}`;
  };
  const sortHref = (field: SortKey) =>
    href({ sort: field, dir: effectiveSort === field ? (effectiveDir === "asc" ? "desc" : "asc") : undefined, page: undefined });
  const sortHrefs: Record<SortKey, string> = { code: sortHref("code"), date: sortHref("date"), uses: sortHref("uses") };

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-medium",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="mx-auto w-full max-w-[1920px]">
      <nav aria-label="Navegação" className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/kanban" className="hover:text-foreground">Mapa Cirúrgico</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Composições</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Layers className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Composições Cirúrgicas</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de combinações de procedimentos e materiais/OPME. Guias idênticas reutilizam a mesma composição; qualquer diferença gera uma nova.
          </p>
        </div>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Composições indisponíveis. Verifique se as migrations 0024 e 0025 foram executadas.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><Layers className="h-5 w-5" /></span>
              <div><p className="text-2xl font-semibold leading-none text-foreground">{all.length}</p><p className="mt-1 text-xs text-muted-foreground">Composições cadastradas</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500"><FileText className="h-5 w-5" /></span>
              <div><p className="text-2xl font-semibold leading-none text-foreground">{totalGuides}</p><p className="mt-1 text-xs text-muted-foreground">Guias vinculadas</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500"><Star className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Mais utilizada</p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {mostUsed && mostUsed.surgeries.length > 0
                    ? `${formatCompositionCode(mostUsed.number)} · ${mostUsed.surgeries.length} guia(s)`
                    : "—"}
                </p>
                {mostUsed && mostUsed.surgeries.length > 0 ? <p className="truncate text-xs text-muted-foreground">{mostUsed.name}</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <form method="get" action="/catalog/compositions" className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={q}
                  maxLength={80}
                  placeholder="Buscar por CMP, TUSS, procedimento ou material…"
                  aria-label="Buscar composições"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                />
              </div>
              {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
              {first(sp.sort) ? <input type="hidden" name="sort" value={first(sp.sort)} /> : null}
              {first(sp.dir) ? <input type="hidden" name="dir" value={first(sp.dir)} /> : null}
              <select
                name="principal"
                defaultValue={principal}
                aria-label="Filtrar por procedimento principal"
                className="h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-[280px]"
              >
                <option value="">Procedimento principal: todos</option>
                {principalOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Buscar</button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <Link href={href({ filter: undefined, page: undefined })} className={chip(filter === "all")}>Todas</Link>
              <Link href={href({ filter: "top", page: undefined })} className={chip(filter === "top")}>Mais utilizadas</Link>
              <Link href={href({ filter: "recent", page: undefined })} className={chip(filter === "recent")}>Recentes</Link>
              {(q || principal) ? <Link href="/catalog/compositions" className="text-xs text-muted-foreground underline hover:text-foreground">Limpar busca</Link> : null}
              <span className="ml-auto text-xs text-muted-foreground">{list.length} resultado(s)</span>
            </div>
          </div>

          <CompositionCatalog rows={rows} sort={effectiveSort} dir={effectiveDir} sortHrefs={sortHrefs} canEdit={canEdit} />

          {pageCount > 1 ? (
            <nav aria-label="Paginação" className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, list.length)} de {list.length}
              </span>
              <div className="flex items-center gap-2">
                {page > 1 ? <Link href={href({ page: String(page - 1) })} className={chip(false)}>Anterior</Link> : null}
                <span>Página {page} de {pageCount}</span>
                {page < pageCount ? <Link href={href({ page: String(page + 1) })} className={chip(false)}>Próxima</Link> : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
