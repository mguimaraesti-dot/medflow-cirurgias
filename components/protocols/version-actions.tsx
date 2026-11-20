"use client";

import { useTransition } from "react";

import {
  createProtocolVersionAction,
  setProtocolVersionStatusAction,
} from "@/app/(dashboard)/protocols/actions";
import type { ProtocolVersion } from "@/lib/data/protocols";
import { Button } from "@/components/ui/button";

const NEXT_STATUS: Record<ProtocolVersion["status"], { status: ProtocolVersion["status"]; label: string } | null> = {
  draft: { status: "pending_approval", label: "Enviar para aprovação" },
  pending_approval: { status: "approved", label: "Aprovar" },
  approved: { status: "archived", label: "Arquivar" },
  archived: null,
};

export function VersionStatusAction({
  version,
  protocolId,
}: {
  version: ProtocolVersion;
  protocolId: string;
}) {
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[version.status];
  if (!next) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() =>
          setProtocolVersionStatusAction(version.id, protocolId, next.status)
        )
      }
    >
      {pending ? "Salvando..." : next.label}
    </Button>
  );
}

export function NewVersionButton({
  protocolId,
  cloneFromVersionId,
}: {
  protocolId: string;
  cloneFromVersionId?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => createProtocolVersionAction(protocolId, cloneFromVersionId))
      }
    >
      {pending ? "Criando..." : cloneFromVersionId ? "Nova versão (copiar itens)" : "Nova versão (em branco)"}
    </Button>
  );
}
