"use client";

import { useActionState, useRef, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
  addSurgeryMaterialItemAction,
  setSurgeryMaterialItemStatusAction,
  removeSurgeryMaterialItemAction,
  importProtocolVersionItemsAction,
  type SurgeryMaterialFormState,
} from "@/app/(dashboard)/surgeries/operations-actions";
import type { SurgeryMaterialItem } from "@/lib/data/operations";
import type { ImportableProtocolVersion } from "@/lib/data/protocols";
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

const STATUS_LABEL: Record<string, string> = {
  suggested: "Sugerido",
  requested: "Solicitado",
  confirmed: "Confirmado",
  delivered: "Entregue",
  used: "Utilizado",
  substituted: "Substituído",
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
  items,
  materials,
  suppliers,
  importableVersions,
}: {
  surgeryId: string;
  items: SurgeryMaterialItem[];
  materials: { id: string; name: string }[];
  suppliers: { id: string; company_name: string }[];
  importableVersions: ImportableProtocolVersion[];
}) {
  const action = addSurgeryMaterialItemAction.bind(null, surgeryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [importPending, startImport] = useTransition();
  useActionToast(state, "Material adicionado.");

  return (
    <div className="flex flex-col gap-4">
      {importableVersions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted p-3">
          <p className="text-sm text-muted-foreground">Importar itens de um protocolo aprovado:</p>
          {importableVersions.map((version) => (
            <Button
              key={version.id}
              variant="outline"
              size="sm"
              disabled={importPending}
              onClick={() =>
                startImport(async () => {
                  await importProtocolVersionItemsAction(surgeryId, version.id);
                  toast.success("Itens do protocolo importados.");
                })
              }
            >
              {version.protocol_name} (v{version.version_number})
            </Button>
          ))}
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
        <div className="grid grid-cols-4 gap-2">
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
