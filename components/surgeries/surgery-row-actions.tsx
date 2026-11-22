"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Eye, MoreVertical, Pencil, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cancelSurgeryAction } from "@/app/(dashboard)/surgeries/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Menu "⋮" da linha. Só mostra o que existe e o usuário pode fazer:
 * visualizar e consultar autorização sempre; editar, atualizar agendamento
 * e cancelar só com permissão de edição (e cancelar/agendar só em cirurgia
 * em aberto). Materiais/OPME não aparece porque saiu da ficha da cirurgia.
 */
export function SurgeryRowActions({
  surgeryId,
  code,
  canEdit,
  isOpen,
}: {
  surgeryId: string;
  code: string;
  canEdit: boolean;
  /** Cirurgia ainda em andamento (não realizada nem cancelada). */
  isOpen: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  function toggle() {
    if (menu) return setMenu(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 224;
    const height = 220;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setMenu({ top, left });
  }

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none";

  function confirmCancel() {
    startTransition(async () => {
      try {
        await cancelSurgeryAction(surgeryId, reason.trim());
        toast.success(`Cirurgia ${code} cancelada.`);
        setCancelOpen(false);
        setReason("");
        router.refresh();
      } catch {
        toast.error("Não foi possível cancelar. Verifique sua permissão e tente novamente.");
      }
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`Ações da cirurgia ${code}`}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: menu.top, left: menu.left, width: 224 }}
          className="z-50 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          <Link role="menuitem" href={`/surgeries/${surgeryId}`} className={item}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            Visualizar cirurgia
          </Link>
          {canEdit ? (
            <Link role="menuitem" href={`/surgeries/${surgeryId}/edit`} className={item}>
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Editar cirurgia
            </Link>
          ) : null}
          <Link role="menuitem" href={`/surgeries/${surgeryId}?open=authorization#requisitos`} className={item}>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Consultar autorização
          </Link>
          {canEdit && isOpen ? (
            <Link role="menuitem" href={`/surgeries/${surgeryId}?open=or_reservation#requisitos`} className={item}>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Atualizar agendamento
            </Link>
          ) : null}
          {canEdit && isOpen ? (
            <>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                role="menuitem"
                className={`${item} text-red-600 dark:text-red-400`}
                onClick={() => {
                  setMenu(null);
                  setCancelOpen(true);
                }}
              >
                <XCircle className="h-4 w-4" />
                Cancelar cirurgia
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={(o) => !pending && setCancelOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar a cirurgia {code}?</DialogTitle>
            <DialogDescription>
              Informe o motivo. O cancelamento fica registrado no histórico da cirurgia.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento (obrigatório)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)} disabled={pending}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || reason.trim().length === 0}
              onClick={confirmCancel}
            >
              {pending ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
