"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  createSurgery,
  updateSurgery,
  moveSurgeryStage,
  moveSurgeryCard,
  cancelSurgery,
  setSurgerySchedule,
  getSurgeryHistoryTimeline,
  updateRequirement,
  setRequirementSatisfied,
  upsertParticularFinancialRecord,
  setSurgeryProcedures,
  type SurgeryUpdateInput,
} from "@/lib/data/surgeries";
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

  revalidatePath("/kanban");
  revalidatePath("/surgeries");
  revalidatePath(`/surgeries/${id}`);
  return {};
}

export async function moveSurgeryStageAction(surgeryId: string, stageId: string) {
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
  const supabase = await createClient();
  await moveSurgeryCard(supabase, surgeryId, stageId, boardPosition);
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
}

export async function cancelSurgeryAction(surgeryId: string, reason: string) {
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

  const supabase = await createClient();
  try {
    await updateRequirement(supabase, requirementId, parsed.data);
  } catch {
    return { error: "Não foi possível atualizar o requisito." };
  }

  revalidatePath(`/surgeries/${surgeryId}`);
  return {};
}

/** Alterna o "satisfeito" direto do checklist rápido do painel lateral do
 * Mapa Cirúrgico — sem formulário, sem lidar com dispensa/justificativa
 * (isso continua só na página completa da cirurgia). */
export async function toggleRequirementSatisfiedAction(
  requirementId: string,
  surgeryId: string,
  isSatisfied: boolean
) {
  const supabase = await createClient();
  await setRequirementSatisfied(supabase, requirementId, isSatisfied);
  revalidatePath("/kanban");
  revalidatePath(`/surgeries/${surgeryId}`);
}

export type FinancialFormState = { error?: string };

export async function saveParticularFinancialAction(
  surgeryId: string,
  _prevState: FinancialFormState,
  formData: FormData
): Promise<FinancialFormState> {
  const parsed = particularFinancialSchema.safeParse({
    expected_value: formData.get("expected_value"),
    agreed_value: formData.get("agreed_value"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Dados inválidos." };
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
