"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { X } from "lucide-react";

import {
  addMaterialSupplierAction,
  removeMaterialSupplierAction,
  getMaterialSuppliersAction,
  type MaterialSupplierFormState,
} from "@/app/(dashboard)/catalog/materials/actions";
import type { MaterialSupplierRow } from "@/lib/data/materials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: MaterialSupplierFormState = {};

function LinkRow({
  link,
  materialId,
  onRemoved,
}: {
  link: MaterialSupplierRow;
  materialId: string;
  onRemoved?: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{link.supplier?.company_name ?? "Fornecedor removido"}</span>
        {link.preferred ? <Badge variant="outline">Preferencial</Badge> : null}
        {link.supplier && !link.supplier.active ? <Badge variant="secondary">Fornecedor inativo</Badge> : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await removeMaterialSupplierAction(link.id, materialId);
            await onRemoved?.();
          })
        }
        aria-label="Remover vínculo"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function MaterialSuppliersCard({
  materialId,
  links,
  activeSuppliers,
  onLinksChange,
}: {
  materialId: string;
  links: MaterialSupplierRow[];
  activeSuppliers: { id: string; company_name: string }[];
  /** Quando informado (uso no painel lateral de Materiais), é chamado após
   * vincular/remover um fornecedor, pra buscar a lista atualizada — no
   * lugar de depender do re-render do Server Component da página. */
  onLinksChange?: (links: MaterialSupplierRow[]) => void;
}) {
  const action = addMaterialSupplierAction.bind(null, materialId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  async function refetchLinks() {
    if (!onLinksChange) return;
    const updated = await getMaterialSuppliersAction(materialId);
    onLinksChange(updated);
  }

  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!pending && !state.error) {
      formRef.current?.reset();
      void refetchLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const linkedSupplierIds = new Set(links.map((l) => l.supplier_id));
  const availableSuppliers = activeSuppliers.filter((s) => !linkedSupplierIds.has(s.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Fornecedores vinculados {links.length > 0 ? `(${links.length})` : ""}
        </h3>
        {links.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            Nenhum fornecedor vinculado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} materialId={materialId} onRemoved={refetchLinks} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-medium text-foreground">Vincular fornecedor</h3>
        {availableSuppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos os fornecedores ativos já estão vinculados a este material (ou não há
            fornecedores ativos cadastrados).
          </p>
        ) : (
          <form ref={formRef} action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Select name="supplier_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {availableSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="preferred" value="on" />
              Fornecedor preferencial
            </label>

            {state.error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} className="self-start">
              {pending ? "Vinculando..." : "Vincular"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
