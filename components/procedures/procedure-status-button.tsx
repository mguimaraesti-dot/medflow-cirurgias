"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PauseCircle, PlayCircle } from "lucide-react";

import { toggleProcedureActiveAction } from "@/app/(dashboard)/catalog/procedures/actions";
import { Button } from "@/components/ui/button";

export function ProcedureStatusButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleProcedureActiveAction(id, !active);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(active ? "Procedimento inativado." : "Procedimento reativado.");
          router.refresh();
        })
      }
    >
      {active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
      {active ? "Inativar" : "Reativar"}
    </Button>
  );
}
