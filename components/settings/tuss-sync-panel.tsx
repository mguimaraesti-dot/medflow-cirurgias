"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { syncTussBatchAction } from "@/app/(dashboard)/settings/tuss/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TableInfo = {
  key: "tuss-22";
  title: string;
  description: string;
  count: number;
  lastSyncedAt: string | null;
  /** Página para retomar uma atualização interrompida (0 = não há). */
  resumePage: number;
};

function formatWhen(iso: string | null) {
  if (!iso) return "Nunca atualizada";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TableCard({ info, canEdit }: { info: TableInfo; canEdit: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ page: number; saved: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  async function run(fromPage: number) {
    cancelRef.current = false;
    setRunning(true);
    setError(null);
    let page = fromPage;
    let saved = 0;
    setProgress({ page, saved });
    while (!cancelRef.current) {
      const res = await syncTussBatchAction(info.key, page);
      if (!res.ok) {
        setError(res.error ?? "Falha na atualização.");
        break;
      }
      saved += res.saved ?? 0;
      page = res.nextPage ?? page + 1;
      setProgress({ page, saved });
      if (res.done) {
        toast.success(`${info.title}: tabela atualizada.`);
        router.refresh();
        break;
      }
    }
    setRunning(false);
    if (cancelRef.current) router.refresh();
  }

  const canResume = info.resumePage > 1;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div>
          <p className="text-sm font-medium text-foreground">{info.title}</p>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Códigos na cópia local</dt>
            <dd className="text-foreground">{info.count.toLocaleString("pt-BR")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Última atualização</dt>
            <dd className="text-foreground">{formatWhen(info.lastSyncedAt)}</dd>
          </div>
        </dl>

        {running && progress ? (
          <p className="text-sm text-muted-foreground" role="status">
            Atualizando… página {progress.page} · {progress.saved.toLocaleString("pt-BR")} códigos
            gravados nesta execução. Pode levar alguns minutos.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button type="button" variant="outline" className="h-10" onClick={() => (cancelRef.current = true)}>
                Pausar
              </Button>
            ) : (
              <>
                <Button type="button" className="h-10" onClick={() => run(1)}>
                  {info.count > 0 ? "Atualizar" : "Baixar tabela"}
                </Button>
                {canResume ? (
                  <Button type="button" variant="outline" className="h-10" onClick={() => run(info.resumePage)}>
                    Continuar de onde parou
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Você não tem permissão para atualizar.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TussSyncPanel({ tables, canEdit }: { tables: TableInfo[]; canEdit: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {tables.map((t) => (
        <TableCard key={t.key} info={t} canEdit={canEdit} />
      ))}
    </div>
  );
}
