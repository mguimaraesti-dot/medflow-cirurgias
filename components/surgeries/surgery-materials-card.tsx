"use client";

import { useActionState, useRef, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  addSurgeryMaterialItemAction,
  setSurgeryMaterialItemStatusAction,
  removeSurgeryMaterialItemAction,
  importProcedureDefaultMaterialsAction,
  updateProcedureDefaultMaterialsAction,
  type SurgeryMaterialFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { SurgeryMaterialItem } from "@/lib/data/operations";
import type { ProcedureDefaultMaterial } from "@/lib/data/procedure-materials";
import { materialsDifferFromDefault } from "@/lib/surgery-materials-diff";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Simplificado pra só 2 estados (quem usa no dia a dia não precisa de
// mais granularidade que isso): Solicitado → Entregue. Um item com um
// status antigo (de antes dessa simplificação) ainda aparece rotulado
// corretamente graças ao fallback em STATUS_LABEL[item.status] ?? item.status.
const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitado",
  delivered: "Entregue",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABEL);

function ItemRow({ item, surgeryId }: { item: SurgeryMaterialItem; surgeryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">
          {item.material?.name ?? "Material removido"}{" "}
          <span className="text-muted-foreground">× {item.quantity}</span>
        </p>
        {item.supplier ? (
          <p className="text-xs text-muted-foreground">Fornecedor: {item.supplier.company_name}</p>
        ) : null}
      </div>
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
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue>
            <Badge variant="outline">{STATUS_LABEL[item.status] ?? item.status}</Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await removeSurgeryMaterialItemAction(item.id, surgeryId);
            toast.success("Material removido.");
          })
        }
        aria-label="Remover material"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

const initialState: SurgeryMaterialFormState = {};

export function SurgeryMaterialsCard({
  surgeryId,
  procedureIds,
  primaryProcedureId,
  items,
  materials,
  suppliers,
  defaultMaterials,
}: {
  surgeryId: string;
  /** Todos os procedimentos da cirurgia — os kits padrão são somados. */
  procedureIds: string[];
  /** Procedimento principal — é o kit atualizado pelo botão "Atualizar
   * padrão com esta lista" quando há mais de um procedimento. */
  primaryProcedureId: string;
  items: SurgeryMaterialItem[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  defaultMaterials: ProcedureDefaultMaterial[];
}) {
  const action = addSurgeryMaterialItemAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [importPending, startImport] = useTransition();
  const [updatePending, startUpdate] = useTransition();
  useActionToast(state, "Material adicionado.");

  const differsFromDefault =
    items.length > 0 &&
    materialsDifferFromDefault(
      items.map((i) => ({ material_id: i.material_id, quantity: i.quantity, supplier_id: i.supplier_id })),
      defaultMaterials
    );

  return (
    <div className="flex flex-col gap-4">
      {defaultMaterials.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            {procedureIds.length > 1 ? "Kits padrão somados dos procedimentos têm" : "Kit padrão deste procedimento tem"}{" "}
            {defaultMaterials.length} material
            {defaultMaterials.length === 1 ? "" : "is"}.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={importPending}
            onClick={() =>
              startImport(async () => {
                await importProcedureDefaultMaterialsAction(surgeryId, procedureIds);
                toast.success("Materiais padrão carregados.");
              })
            }
          >
            Carregar materiais padrão
          </Button>
        </div>
      ) : null}

      {differsFromDefault ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Esta lista é diferente do kit padrão {procedureIds.length > 1 ? "somado dos procedimentos" : "do procedimento"}.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={updatePending}
            onClick={() =>
              startUpdate(async () => {
                await updateProcedureDefaultMaterialsAction(primaryProcedureId, surgeryId);
                toast.success(
                  procedureIds.length > 1
                    ? "Kit padrão do procedimento principal atualizado."
                    : "Kit padrão do procedimento atualizado."
                );
              })
            }
          >
            {updatePending ? "Atualizando..." : "Atualizar padrão com esta lista"}
          </Button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum material adicionado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} surgeryId={surgeryId} />
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex flex-col gap-2 border-t border-border pt-4"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="col-span-2">
            <Select name="material_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select name="supplier_id">
            <SelectTrigger>
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.company_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue={1} />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="self-start">
          {pending ? "Adicionando..." : "Adicionar material"}
        </Button>
      </form>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
