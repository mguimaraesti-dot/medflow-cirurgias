"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import {
  createSurgery,
  updateSurgery,
  moveSurgeryStage,
  moveSurgeryCard,
  cancelSurgery,
  setSurgerySchedule,
  getSurgeryHistoryTimeline,
  updateRequirement,
  upsertParticularFinancialRecord,
  setSurgeryProcedures,
  getSurgeryAuthorizationRequestData,
  type SurgeryUpdateInput,
} from "@/lib/data/surgeries";
import { addSurgeryMaterialItem } from "@/lib/data/operations";
import { addSurgeryDocument } from "@/lib/data/surgery-documents";
import { getCurrentUser } from "@/lib/auth/session";
import { importBestComposition, syncSurgeryComposition } from "@/lib/data/compositions";
import { buildAuthorizationRequestText } from "@/lib/authorization-request";
import {
  surgerySchema,
  surgeryProceduresSchema,
  requirementUpdateSchema,
  particularFinancialSchema,
  type SurgeryInput,
} from "@/lib/validation/surgeries";

export type SurgeryFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return surgerySchema.safeParse({
    patient_id: formData.get("patient_id"),
    hospital_id: formData.get("hospital_id"),
    insurance_provider_id: formData.get("insurance_provider_id"),
    attendance_type: formData.get("attendance_type"),
    indication_date: formData.get("indication_date"),
    expected_date: formData.get("expected_date"),
    confirmed_date: formData.get("confirmed_date"),
    confirmed_time: formData.get("confirmed_time"),
    priority: formData.get("priority") || "normal",
    admin_notes: formData.get("admin_notes"),
  });
}

function parseProcedures(formData: FormData) {
  return surgeryProceduresSchema.safeParse({
    procedure_ids: formData.getAll("procedure_ids"),
    primary_procedure_id: formData.get("primary_procedure_id"),
  });
}

// Quando o tipo de atendimento é "particular", o campo de operadora não é
// renderizado no formulário — além de não ser enviado, forçamos
// explicitamente null aqui para o caso de edição (sem isso, uma cirurgia
// que já era convênio e virou particular manteria a operadora antiga, já
// que uma chave ausente no FormData não apaga a coluna, só a deixa intocada).
function clearInsuranceIfParticular(formData: FormData, data: SurgeryInput): SurgeryUpdateInput {
  if (formData.get("attendance_type") === "particular") {
    return { ...data, insurance_provider_id: null };
  }
  return data;
}

export async function createSurgeryAction(
  _prevState: SurgeryFormState,
  formData: FormData
): Promise<SurgeryFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const parsedProcedures = parseProcedures(formData);
  if (!parsedProcedures.success) {
    return { error: parsedProcedures.error.issues[0]?.message ?? "Selecione os procedimentos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  let surgeryId: string;
  try {
    const result = await createSurgery(supabase, clearInsuranceIfParticular(formData, parsed.data));
    surgeryId = result.id;
    await setSurgeryProcedures(
      supabase,
      surgeryId,
      parsedProcedures.data.procedure_ids,
      parsedProcedures.data.primary_procedure_id
    );
  } catch {
    return { error: "Não foi possível criar a cirurgia. Tente novamente." };
  }

  // Materiais sugeridos pela leitura do pedido (já revisados pelo usuário).
  // Falha aqui não desfaz a cirurgia: eles podem ser adicionados na ficha.
  const materialIds = formData.getAll("suggested_material_id").map(String);
  const materialQtys = formData.getAll("suggested_material_qty").map(Number);
  const materialSuppliers = formData.getAll("suggested_material_supplier").map(String);
  const seen = new Set<string>();
  for (const [i, materialId] of materialIds.slice(0, 40).entries()) {
    if (!/^[0-9a-f-]{36}$/i.test(materialId) || seen.has(materialId)) continue;
    seen.add(materialId);
    const quantity = Number.isFinite(materialQtys[i]) && materialQtys[i] > 0 ? materialQtys[i] : 1;
    try {
      const supplierId = /^[0-9a-f-]{36}$/i.test(materialSuppliers[i] ?? "") ? materialSuppliers[i] : undefined;
      await addSurgeryMaterialItem(supabase, surgeryId, { material_id: materialId, quantity, supplier_id: supplierId });
    } catch (e) {
      console.error("[surgery] material sugerido não adicionado:", e);
    }
  }

  // Cadastro manual (sem materiais vindos da guia): sugere a composição mais
  // usada para o mesmo conjunto de procedimentos.
  if (seen.size === 0) await importBestComposition(supabase, surgeryId);
  await syncSurgeryComposition(supabase, surgeryId);

  // Foto da guia lida pela IA: fica anexada à cirurgia para consulta.
  const guidePhoto = formData.get("guide_photo");
  if (
    guidePhoto instanceof File &&
    guidePhoto.size > 0 &&
    guidePhoto.size <= 5 * 1024 * 1024 &&
    guidePhoto.type.startsWith("image/")
  ) {
    try {
      const user = await getCurrentUser();
      await addSurgeryDocument(
        supabase,
        surgeryId,
        guidePhoto,
        "Guia de pedido cirúrgico (foto lida pela IA)",
        user?.id ?? null
      );
    } catch (e) {
      console.error("[surgery] foto da guia não anexada:", e);
    }
  }

  revalidatePath("/kanban");
  revalidatePath("/surgeries");
  redirect(`/surgeries/${surgeryId}`);
}

export async function updateSurgeryAction(
  id: string,
  _prevState: SurgeryFormState,
  formData: FormData
): Promise<SurgeryFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const parsedProcedures = parseProcedures(formData);
  if (!parsedProcedures.success) {
    return { error: parsedProcedures.error.issues[0]?.message ?? "Selecione os procedimentos." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateSurgery(supabase, id, clearInsuranceIfParticular(formData, parsed.data));
    await setSurgeryProcedures(
      supabase,
      id,
      parsedProcedures.data.procedure_ids,
      parsedProcedures.data.primary_procedure_id
    );
  } catch {
    return { error: "Não foi possível salvar a cirurgia. Tente novamente." };
  }
  await importBestComposition(supabase, id);
  await syncSurgeryComposition(supabase, id);

  revalidatePath("/kanban");
  revalidatePath("/surgeries");
  revalidatePath(`/surgeries/${id}`);
  return {};
}

export async function moveSurgeryStageAction(surgeryId: string, stageId: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await moveSurgeryStage(supabase, surgeryId, stageId);
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
}

/** Drag-and-drop do board: move e/ou reordena um card pra uma posição
 * específica dentro de uma coluna (entre dois vizinhos, ou no
 * início/fim). */
export async function moveSurgeryCardAction(
  surgeryId: string,
  stageId: string,
  boardPosition: number
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await moveSurgeryCard(supabase, surgeryId, stageId, boardPosition);
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
}

export async function cancelSurgeryAction(surgeryId: string, reason: string) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await cancelSurgery(supabase, surgeryId, reason);
  revalidatePath("/kanban");
  revalidatePath("/surgeries");
  revalidatePath("/schedule");
  revalidatePath(`/surgeries/${surgeryId}`);
}

/** Confirmar/remarcar rápido pelo painel lateral da Agenda — só a
 * data/horário, sem abrir o formulário completo de edição. */
export async function setSurgeryScheduleAction(
  surgeryId: string,
  confirmedDate: string,
  confirmedTime: string | null
) {
  await requireActionPermission("surgeries");
  const supabase = await createClient();
  await setSurgerySchedule(supabase, surgeryId, { confirmedDate, confirmedTime });
  revalidatePath("/schedule");
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
}

/** Histórico de alterações, buscado só quando o painel lateral da Agenda
 * é aberto (não vem junto com a lista do mês inteiro, pra não pesar o
 * carregamento normal da Agenda). */
export async function getSurgeryHistoryAction(surgeryId: string) {
  await requireActionPermission("surgeries", "view");
  const supabase = await createClient();
  return getSurgeryHistoryTimeline(supabase, surgeryId);
}

export type RequirementFormState = { error?: string };

export async function updateRequirementAction(
  requirementId: string,
  surgeryId: string,
  _prevState: RequirementFormState,
  formData: FormData
): Promise<RequirementFormState> {
  const parsed = requirementUpdateSchema.safeParse({
    is_satisfied: formData.get("is_satisfied") === "on",
    waived: formData.get("waived") === "on",
    waived_reason: formData.get("waived_reason"),
  });
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }
  if (parsed.data.waived && !parsed.data.waived_reason) {
    return { error: "Informe a justificativa para dispensar este requisito." };
  }
  try {
    await requireActionPermission("surgeries");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateRequirement(supabase, requirementId, parsed.data);
  } catch {
    return { error: "Não foi possível atualizar o requisito." };
  }

  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

/**
 * Gera o texto pronto pra copiar e enviar à central de autorizações do
 * convênio/hospital (botão no painel rápido do Kanban) — só leitura, não
 * precisa de revalidatePath.
 */
export async function getAuthorizationRequestTextAction(surgeryId: string): Promise<string> {
  await requireActionPermission("surgeries", "view");
  const supabase = await createClient();
  const data = await getSurgeryAuthorizationRequestData(supabase, surgeryId);
  return buildAuthorizationRequestText(data);
}

export type FinancialFormState = { error?: string };

export async function saveParticularFinancialAction(
  surgeryId: string,
  _prevState: FinancialFormState,
  formData: FormData
): Promise<FinancialFormState> {
  const parsed = particularFinancialSchema.safeParse({
    agreed_value: formData.get("agreed_value"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Dados inválidos." };
  }
  try {
    await requireActionPermission("financial");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await upsertParticularFinancialRecord(supabase, surgeryId, parsed.data);
  } catch {
    return { error: "Não foi possível salvar os valores." };
  }

  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}
