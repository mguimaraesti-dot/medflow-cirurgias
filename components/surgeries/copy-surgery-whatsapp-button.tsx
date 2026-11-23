"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { getSurgeryWhatsappTextAction } from "@/app/(dashboard)/reports/whatsapp-actions";
import { WhatsappIcon } from "@/components/shared/whatsapp-icon";
import { Button } from "@/components/ui/button";

/** Copia a mensagem de WhatsApp só desta cirurgia (para colar na conversa com o Dr. Flávio). */
export function CopySurgeryWhatsappButton({ surgeryId }: { surgeryId: string }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        const text = await getSurgeryWhatsappTextAction(surgeryId);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Mensagem do WhatsApp copiada.");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Não foi possível copiar a mensagem.");
      }
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
      {copied ? <Check className="h-4 w-4" /> : <WhatsappIcon className="h-4 w-4 text-[#25D366]" />}
      {pending ? "Copiando..." : copied ? "Copiado!" : "Copiar p/ WhatsApp"}
    </Button>
  );
}
