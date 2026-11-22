"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, MoreVertical, Package, Pencil, PauseCircle, PlayCircle, Trash2 } from "lucide-react";

import { deleteProcedureAction, toggleProcedureActiveAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureListRow } from "@/lib/data/procedures-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProcedureFormDialog } from "@/components/procedures/procedure-form-dialog";

/**
 * Menu "⋮" da linha: visualizar (ficha), editar, materiais padrão, inativar/reativar
 * e excluir. Editar/inativar/excluir só aparecem com permissão de edição; a exclusão
 * é recusada pelo servidor quando o procedimento já foi usado em cirurgia.
 */
export function ProcedureRowActions({ procedure, canEdit }: { procedure: ProcedureListRow; canEdit: boolean }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  function toggleMenu() {
    if (menu) return setMenu(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 224;
    const height = canEdit ? 260 : 100;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 4) : rect.bottom + 4;
    setMenu({ top, left });
  }

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none";

  function toggleActive() {
    setMenu(null);
    startTransition(async () => {
      const result = await toggleProcedureActiveAction(procedure.id, !procedure.active);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(procedure.active ? "Procedimento inativado." : "Procedimento reativado.");
      router.refresh();
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteProcedureAction(procedure.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      toast.success("Procedimento excluído.");
      setDeleteOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        disabled={pending}
        aria-label={`Ações de ${procedure.name}`}
        aria-haspopup="menu"
        aria-expanded={!!menu}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
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
          <Link role="menuitem" href={`/catalog/procedures/${procedure.id}`} className={item}>
            <Eye className="h-4 w-4 text-muted-foreground" />
            Visualizar
          </Link>
          {canEdit ? (
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setMenu(null);
                setEditOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              Editar
            </button>
          ) : null}
          <Link role="menuitem" href={`/catalog/procedures/${procedure.id}#materiais`} className={`${item} font-medium text-primary`}>
            <Package className="h-4 w-4" />
            {canEdit ? "Configurar materiais padrão" : "Ver materiais padrão"}
          </Link>
          {canEdit ? (
            <>
              <div className="my-1 border-t border-border" />
              <button type="button" role="menuitem" className={item} onClick={toggleActive}>
                {procedure.active ? (
                  <PauseCircle className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                )}
                {procedure.active ? "Inativar" : "Reativar"}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${item} text-red-600 dark:text-red-400`}
                onClick={() => {
                  setMenu(null);
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {canEdit ? <ProcedureFormDialog procedure={procedure} open={editOpen} onOpenChange={setEditOpen} /> : null}

      <Dialog open={deleteOpen} onOpenChange={(o) => !pending && setDeleteOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir procedimento?</DialogTitle>
            <DialogDescription>
              {`"${procedure.name}" e o kit de materiais padrão dele serão removidos definitivamente. Se já foi usado em cirurgias, prefira inativar.`}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmDelete}>
              {pending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
