"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Botão de excluir pra usar na linha de uma tabela (cadastros). Pede
 * confirmação, chama a server action e, se o banco recusar por causa de
 * vínculo (FK), mostra a mensagem amigável que a action já traduziu —
 * nunca o erro bruto do Postgres.
 */
export function DeleteRowButton({
  onDelete,
  confirmMessage,
}: {
  onDelete: () => Promise<{ error?: string } | void>;
  confirmMessage: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setError(null);
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await onDelete();
      if (result && "error" in result && result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={handleClick}
        className="gap-1 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Excluir
      </Button>
      {error ? (
        <p className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-popover p-2 text-xs text-destructive shadow-md">
          {error}
        </p>
      ) : null}
    </div>
  );
}
