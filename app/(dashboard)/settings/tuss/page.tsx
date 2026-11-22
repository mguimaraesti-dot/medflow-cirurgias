import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireModuleView } from "@/lib/auth/guard";
import { getCurrentUser, hasPermission } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
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

  const [{ count: t19Count }, { data: t19State }] = await Promise.all([
    supabase.from("tuss_terms").select("code", { count: "exact", head: true }).eq("table_name", "tuss-19"),
    supabase.from("tuss_sync_state").select("last_synced_at").eq("table_name", "tuss-19").maybeSingle(),
  ]);
  const t19When = (t19State?.last_synced_at as string | null | undefined) ?? null;

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
        <Card className="mt-4 max-w-2xl">
          <CardContent className="flex flex-col gap-2 pt-5 text-sm">
            <p className="font-medium text-foreground">Materiais e OPME (TUSS 19)</p>
            <p className="text-muted-foreground">
              Usada no cadastro de materiais. A tabela completa da ANS tem mais de 1,5 milhão de itens e não
              cabe no plano gratuito do Supabase; por isso a cópia local traz os materiais de endoscopia
              digestiva (papilótomo, fio guia, alça, balões, próteses, clipes, pinças…). O que não estiver
              na cópia é buscado ao vivo na ANS.
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Códigos na cópia local</dt>
                <dd className="text-foreground">{(t19Count ?? 0).toLocaleString("pt-BR")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Última importação</dt>
                <dd className="text-foreground">
                  {t19When
                    ? new Date(t19When).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
                    : "Nunca importada"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Para atualizar: baixe o ZIP da TUSS 19 no portal da ANS e rode, na pasta do projeto,{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                node --env-file=.env.local scripts/import-tuss19.mjs arquivo.zip
              </code>
              . É seguro repetir (atualiza por código). Para incluir outras áreas, edite{" "}
              <code className="rounded bg-muted px-1 py-0.5">scripts/tuss19-filter.mjs</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
