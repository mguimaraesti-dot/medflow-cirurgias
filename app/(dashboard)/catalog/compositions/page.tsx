import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listAllCompositions, type CompositionListItem } from "@/lib/data/compositions";
import { Badge } from "@/components/ui/badge";

export default async function CompositionsPage() {
  await requireModuleView("procedures");
  const supabase = await createClient();

  let compositions: CompositionListItem[] = [];
  let unavailable = false;
  try {
    compositions = await listAllCompositions(supabase);
  } catch {
    unavailable = true;
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <nav aria-label="Navegação" className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/kanban" className="hover:text-foreground">
          Mapa Cirúrgico
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Composições</span>
      </nav>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Composições</h1>
          <p className="text-sm text-muted-foreground">
            Cada composição é uma combinação de procedimentos + materiais/OPME com quantidades. Guias iguais reutilizam a
            mesma composição; qualquer diferença gera uma nova.
          </p>
        </div>
      </div>

      {unavailable ? (
        <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Composições indisponíveis. Verifique se a migration 0024 foi executada.
        </p>
      ) : compositions.length === 0 ? (
        <p className="mt-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Nenhuma composição cadastrada ainda. Elas são criadas automaticamente quando uma cirurgia é salva com
          procedimentos e materiais.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {compositions.map((c) => (
            <li key={c.id} id={`comp-${c.number}`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-foreground">Composição #{c.number}</h2>
                <Badge variant="secondary">
                  {c.surgeries.length} guia(s) · cadastrada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </Badge>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                    Procedimentos ({c.procedures.length})
                  </p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {c.procedures.map((p) => (
                      <li key={p.id}>
                        {p.name}
                        {p.tuss_code ? <span className="text-muted-foreground"> · TUSS {p.tuss_code}</span> : null}
                        {p.is_primary ? <span className="text-muted-foreground"> · principal</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                    Materiais / OPME ({c.materials.length})
                  </p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {c.materials.map((m) => (
                      <li key={m.material_id}>
                        {m.quantity}× {m.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {c.surgeries.length > 0 ? (
                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  Usada em:
                  {c.surgeries.slice(0, 12).map((s) => (
                    <Link key={s.id} href={`/surgeries/${s.id}`} className="font-medium text-foreground hover:underline">
                      {s.code}
                    </Link>
                  ))}
                  {c.surgeries.length > 12 ? <span>e mais {c.surgeries.length - 12}</span> : null}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
