import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { listSurgeries } from "@/lib/data/surgeries";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { SurgeriesTable } from "@/components/surgeries/surgeries-table";

export default async function SurgeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleView("surgeries");
  const { q } = await searchParams;
  const supabase = await createClient();
  const surgeries = await listSurgeries(supabase, q);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-foreground">Cirurgias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as cirurgias cadastradas, incluindo realizadas e canceladas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/kanban">
            <Button variant="outline" size="sm">
              <LayoutGrid className="h-4 w-4" />
              Mapa Cirúrgico
            </Button>
          </Link>
          <Link href="/surgeries/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Nova cirurgia
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Buscar por código (ex: CIR-2026-0001)..." />
        <p className="text-sm text-muted-foreground">
          {surgeries.length} cirurgia{surgeries.length === 1 ? "" : "s"}
        </p>
      </div>

      <SurgeriesTable
        surgeries={surgeries}
        emptyMessage={
          q ? "Nenhuma cirurgia encontrada para essa busca." : "Nenhuma cirurgia cadastrada ainda."
        }
      />
    </div>
  );
}
