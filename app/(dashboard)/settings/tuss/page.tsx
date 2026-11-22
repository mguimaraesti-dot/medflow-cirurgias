import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { TussSyncPanel } from "@/components/settings/tuss-sync-panel";

// Cada lote de atualização consulta a ANS (lenta, até ~25s por página).
export const maxDuration = 60;

const TABLES = [
  { key: "tuss-22", title: "Procedimentos (TUSS 22)", description: "Usada no cadastro de procedimentos." },
] as const;

export default async function TussSettingsPage() {
  await requireModuleView("settings");
  const user = await getCurrentUser();
  const canEdit = user ? await hasPermission(user, "settings", "edit") : false;

  const supabase = await createClient();
  const states = await Promise.all(
    TABLES.map(async (t) => {
      const [{ count }, { data: state }] = await Promise.all([
        supabase.from("tuss_terms").select("code", { count: "exact", head: true }).eq("table_name", t.key),
        supabase.from("tuss_sync_state").select("last_synced_at,last_page,status").eq("table_name", t.key).maybeSingle(),
      ]);
      return {
        ...t,
        count: count ?? 0,
        lastSyncedAt: (state?.last_synced_at as string | null) ?? null,
        resumePage: state?.status === "running" ? ((state?.last_page as number) ?? 0) : 0,
      };
    })
  );

  return (
    <div>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Configurações
      </Link>
      <h1 className="text-lg font-medium text-foreground">Tabela TUSS</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Cópia local das tabelas da ANS. Com ela, a busca de códigos no cadastro é instantânea e
        funciona mesmo se a ANS estiver fora do ar. Atualize de tempos em tempos (a ANS publica
        códigos novos e descontinua outros). A atualização leva alguns minutos; você pode continuar
        usando o sistema em outra aba.
      </p>

      <div className="mt-6">
        <TussSyncPanel tables={states} canEdit={canEdit} />
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Materiais e OPME (TUSS 19) ficam de fora: a ANS lista mais de 1 milhão de itens nessa
          tabela, grande demais para copiar. A busca de materiais continua consultando a ANS ao
          vivo.
        </p>
      </div>
    </div>
  );
}
