"use client";

import { useState, useTransition } from "react";

import { cancelSurgeryAction } from "@/app/(dashboard)/surgeries/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CancelSurgeryButton({ surgeryId }: { surgeryId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Cancelar cirurgia
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3">
      <p className="text-sm font-medium text-red-800 dark:text-red-300">Cancelar esta cirurgia?</p>
      <Textarea
        placeholder="Motivo do cancelamento (obrigatório)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending || reason.trim().length === 0}
          onClick={() =>
            startTransition(() => {
              cancelSurgeryAction(surgeryId, reason.trim());
              setOpen(false);
            })
          }
        >
          {pending ? "Cancelando..." : "Confirmar cancelamento"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
