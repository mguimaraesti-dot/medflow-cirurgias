"use client";

import { useTransition } from "react";
import { X } from "lucide-react";

import { removeProtocolItemAction } from "@/app/(dashboard)/protocols/actions";
import { Button } from "@/components/ui/button";

export function RemoveProtocolItemButton({
  itemId,
  protocolId,
  versionId,
}: {
  itemId: string;
  protocolId: string;
  versionId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => startTransition(() => removeProtocolItemAction(itemId, protocolId, versionId))}
      aria-label="Remover item"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
