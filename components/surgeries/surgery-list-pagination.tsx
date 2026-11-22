"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PAGE_SIZES, surgeryListQuery, type SurgeryListParams } from "@/lib/surgery-list-params";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Números das páginas com "…" quando são muitas: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= count - 2) [count - 1, count - 2, count - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function SurgeryListPagination({
  params,
  page,
  pageCount,
  total,
  shown,
}: {
  params: SurgeryListParams;
  page: number;
  pageCount: number;
  total: number;
  shown: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const href = (p: number) => `/surgeries${surgeryListQuery(params, { page: p })}`;

  const first = total === 0 ? 0 : (page - 1) * params.size + 1;
  const last = (page - 1) * params.size + shown;

  function changeSize(size: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (size === "10") next.delete("size");
    else next.set("size", size);
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors";

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0 ? "Nenhum registro" : `Mostrando ${first} a ${last} de ${total} registro${total === 1 ? "" : "s"}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {pageCount > 1 ? (
          <nav aria-label="Paginação" className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={href(page - 1)} aria-label="Página anterior" className={cn(btn, "border-border hover:bg-muted")}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-hidden className={cn(btn, "border-border opacity-40")}>
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {pageWindow(page, pageCount).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={href(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    btn,
                    p === page
                      ? "border-primary bg-primary font-semibold text-primary-foreground"
                      : "border-transparent text-foreground hover:bg-muted"
                  )}
                >
                  {p}
                </Link>
              )
            )}
            {page < pageCount ? (
              <Link href={href(page + 1)} aria-label="Próxima página" className={cn(btn, "border-border hover:bg-muted")}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-hidden className={cn(btn, "border-border opacity-40")}>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Mostrar:
          <Select value={String(params.size)} onValueChange={changeSize}>
            <SelectTrigger className="h-9 w-20" aria-label="Registros por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
