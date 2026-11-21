"use client";

import { useState, useTransition } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { toast } from "sonner";

import { getAuthorizationRequestTextAction } from "@/app/(dashboard)/surgeries/actions";
import { Button } from "@/components/ui/button";

/**
 * Monta e copia pra área de transferência o texto pronto de solicitação de
 * autorização à central do convênio/hospital, já preenchido com os dados
 * da cirurgia (paciente, convênio, procedimento, código TUSS, materiais do
 * kit padrão...). Só a justificativa clínica da criticidade vem como
 * placeholder entre colchetes, pra completar à mão.
 */
export function CopyAuthorizationRequestButton({ surgeryId }: { surgeryId: string }) {
  const [pending, startTransition] = useTransition();
  const [justCopied, setJustCopied] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        const text = await getAuthorizationRequestTextAction(surgeryId);
        await navigator.clipboard.writeText(text);
        setJustCopied(true);
        toast.success("Texto da solicitação copiado.");
        setTimeout(() => setJustCopied(false), 2000);
      } catch {
        toast.error("Não foi possível copiar a solicitação.");
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {justCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
      {pending ? "Copiando..." : justCopied ? "Copiado!" : "Copiar solicitação"}
    </Button>
  );
}
