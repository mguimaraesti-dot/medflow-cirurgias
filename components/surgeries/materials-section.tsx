"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Check, Package, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  addSurgeryMaterialItemAction,
  removeSurgeryMaterialItemAction,
  setSurgeryMaterialItemStatusAction,
  updateSurgeryMaterialQuantityAction,
  type SurgeryMaterialFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { SurgeryMaterialItem } from "@/lib/data/operations";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = { requested: "Solicitado", delivered: "Entregue" };
const initialState: SurgeryMaterialFormState = {};

function Row({ item, surgeryId, canEdit }: { item: SurgeryMaterialItem; surgeryId: string; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));

  function saveQty() {
    startTransition(async () => {
      const res = await updateSurgeryMaterialQuantityAction(item.id, surgeryId, Number(qty.replace(",", ".")));
      if (res.error) toast.error(res.error);
      else {
        toast.success("Quantidade atualizada.");
        setEditing(false);
      }
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2">
        <p className="font-medium text-foreground">{item.material?.name ?? "Material removido"}</p>
        {item.supplier ? <p className="text-xs text-muted-foreground">Fornecedor: {item.supplier.company_name}</p> : null}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{item.material?.tuss_code ?? "—"}</td>
      <td className="px-3 py-2">
        {editing ? (
          <span className="flex items-center gap-1">
            <Input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="decimal"
              aria-label="Quantidade"
              className="h-8 w-20"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveQty(); } }}
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={pending} onClick={saveQty} aria-label="Salvar quantidade"><Check className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={pending} onClick={() => { setQty(String(item.quantity)); setEditing(false); }} aria-label="Cancelar"><X className="h-4 w-4" /></Button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {item.quantity}
            {canEdit ? (
              <button type="button" onClick={() => setEditing(true)} aria-label="Editar quantidade" className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {canEdit ? (
          <Select
            value={item.status}
            disabled={pending}
            onValueChange={(status) =>
              startTransition(async () => {
                await setSurgeryMaterialItemStatusAction(item.id, surgeryId, status);
                toast.success("Status atualizado.");
              })
            }
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue><Badge variant="outline">{STATUS_LABEL[item.status] ?? item.status}</Badge></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="outline">{STATUS_LABEL[item.status] ?? item.status}</Badge>
        )}
      </td>
      <td className="px-2 py-2 text-right">
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={pending}
            aria-label={`Remover ${item.material?.name ?? "material"}`}
            onClick={() =>
              startTransition(async () => {
                await removeSurgeryMaterialItemAction(item.id, surgeryId);
                toast.success("Material removido.");
              })
            }
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

export function MaterialsSection({
  surgeryId,
  items,
  materials,
  suppliers,
  canEdit,
}: {
  surgeryId: string;
  items: SurgeryMaterialItem[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  canEdit: boolean;
}) {
  const action = addSurgeryMaterialItemAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [adding, setAdding] = useState(false);
  useActionToast(state, "Material adicionado.");

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500"><Package className="h-4 w-4" /></span>
          Materiais e OPME
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{items.length} {items.length === 1 ? "item" : "itens"}</Badge>
          {canEdit ? (
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setAdding((v) => !v)}>
              <Plus className="mr-1 h-3.5 w-3.5" />{adding ? "Fechar" : "Adicionar"}
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum material previsto para esta cirurgia.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Material</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">TUSS</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Qtd.</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold">Situação</th>
                <th scope="col" className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => <Row key={item.id} item={item} surgeryId={surgeryId} canEdit={canEdit} />)}
            </tbody>
          </table>
        </div>
      )}

      {adding && canEdit ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await formAction(formData);
            formRef.current?.reset();
          }}
          className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="col-span-2">
              <Select name="material_id" required>
                <SelectTrigger><SelectValue placeholder="Material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select name="supplier_id">
              <SelectTrigger><SelectValue placeholder="Fornecedor (opcional)" /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue={1} aria-label="Quantidade" />
          </div>
          <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
            {pending ? "Adicionando..." : "Adicionar material"}
          </Button>
          {state.error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{state.error}</p> : null}
        </form>
      ) : null}
    </section>
  );
}
