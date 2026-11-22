"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Info, Scissors, X } from "lucide-react";

import {
  createProcedureAction,
  updateProcedureAction,
  type ProcedureFormState,
} from "@/app/(dashboard)/catalog/procedures/actions";
import type { ProcedureListRow } from "@/lib/data/procedures-list";
import { PROCEDURE_LOCATIONS, PROCEDURE_SPECIALTIES } from "@/lib/constants/procedure-options";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithOther } from "@/components/shared/select-with-other";
import { TussCodeField } from "@/components/procedures/tuss-code-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ProcedureFormState = {};

type EditableProcedure = Pick<
  ProcedureListRow,
  "id" | "internal_code" | "name" | "tuss_code" | "specialty" | "location" | "description" | "admin_notes" | "active"
>;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="h-4 w-1 rounded-full bg-primary" aria-hidden />
      {children}
    </h3>
  );
}

export function ProcedureFormDialog({
  procedure,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  procedure?: EditableProcedure;
  trigger?: ReactNode;
  /** Modo controlado (usado pelo menu "⋮" da listagem); sem isso, o diálogo abre pelo `trigger`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = openProp ?? innerOpen;
  const setOpen = onOpenChange ?? setInnerOpen;
  const [active, setActive] = useState(procedure ? procedure.active : true);
  const action = procedure ? updateProcedureAction.bind(null, procedure.id) : createProcedureAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const handledCreated = useRef<string | null>(null);

  useEffect(() => {
    if (pending || state.error) return;
    if (open) {
      setOpen(false);
    }
    if (state.created && state.created.id !== handledCreated.current) {
      handledCreated.current = state.created.id;
      const id = state.created.id;
      toast.success(`Procedimento ${state.created.internal_code ?? ""} cadastrado.`.replace("  ", " "), {
        description: "Você pode montar agora o kit de materiais padrão (opcional).",
        action: { label: "Materiais padrão", onClick: () => router.push(`/catalog/procedures/${id}`) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined || openProp === undefined ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant={procedure ? "outline" : "default"} size={procedure ? "sm" : "default"}>
              {procedure ? "Editar" : "Novo procedimento"}
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl gap-0 p-0 sm:rounded-2xl">
        <DialogHeader className="flex-row items-center gap-3 border-b border-border p-4 pr-14 sm:p-6 sm:pr-14">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Scissors className="h-6 w-6" />
          </span>
          <div>
            <DialogTitle className="text-xl font-semibold">
              {procedure ? "Editar procedimento" : "Novo procedimento"}
            </DialogTitle>
            <DialogDescription>
              {procedure
                ? "Atualize a identificação e a classificação deste procedimento."
                : "Cadastre um novo procedimento no sistema. O kit de materiais padrão pode ser montado depois."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form action={formAction} className="flex flex-col">
          <div className="flex flex-col gap-6 p-4 sm:p-6">
            {/* ===== Identificação ===== */}
            <section className="flex flex-col gap-4">
              <SectionTitle>Identificação</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">
                    Nome do procedimento <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" name="name" defaultValue={procedure?.name} className="h-11" required autoComplete="off" />
                  <p className="text-xs text-muted-foreground">Nome usado internamente no MedFlow.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="internal_code_view">Código interno</Label>
                  <Input
                    id="internal_code_view"
                    readOnly
                    tabIndex={-1}
                    value={procedure?.internal_code ?? "Gerado ao salvar"}
                    className="h-11 bg-muted/50 text-muted-foreground"
                  />
                  <input type="hidden" name="internal_code" value={procedure?.internal_code ?? ""} />
                </div>
              </div>
              <TussCodeField defaultCode={procedure?.tuss_code} defaultQuery={procedure?.name} />
            </section>

            {/* ===== Classificação ===== */}
            <section className="flex flex-col gap-4 border-t border-border pt-5">
              <SectionTitle>Classificação</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Especialidade médica</Label>
                  <SelectWithOther
                    name="specialty"
                    options={PROCEDURE_SPECIALTIES}
                    defaultValue={procedure?.specialty}
                    placeholder="Selecione a especialidade"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Local de realização</Label>
                  <SelectWithOther
                    name="location"
                    options={PROCEDURE_LOCATIONS}
                    defaultValue={procedure?.location}
                    placeholder="Selecione o local"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={procedure?.description ?? ""}
                  placeholder="Descrição complementar do procedimento."
                />
              </div>
            </section>

            {/* ===== Configuração administrativa ===== */}
            <section className="flex flex-col gap-4 border-t border-border pt-5">
              <SectionTitle>Configuração administrativa</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin_notes">Observações administrativas</Label>
                  <Textarea
                    id="admin_notes"
                    name="admin_notes"
                    rows={3}
                    defaultValue={procedure?.admin_notes ?? ""}
                    placeholder="Informações complementares (opcional)."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="status_select">Status</Label>
                  {active ? <input type="hidden" name="active" value="on" /> : null}
                  <Select value={active ? "active" : "inactive"} onValueChange={(v) => setActive(v === "active")}>
                    <SelectTrigger id="status_select" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ativo
                        </span>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-slate-400" /> Inativo
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {active
                  ? "Este procedimento ficará disponível para seleção em novas cirurgias."
                  : "Procedimento inativo não aparece em novas cirurgias, mas continua no histórico das cirurgias existentes."}
              </p>
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-2xl border-t border-border bg-card p-4 sm:p-5">
            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between")}>
              <p className="text-xs text-muted-foreground">
                Os campos com <span className="font-semibold">*</span> são obrigatórios.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" disabled={pending} onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button type="submit" className="h-11 flex-1 sm:flex-none" disabled={pending}>
                  <Check className="h-4 w-4" />
                  {pending ? "Salvando..." : "Salvar procedimento"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
