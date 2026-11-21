"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
import { createHoliday, updateHoliday, deleteHoliday } from "@/lib/data/holidays";
import { holidaySchema } from "@/lib/validation/holidays";

export type HolidayFormState = {
  error?: string;
};

function parseForm(formData: FormData) {
  return holidaySchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    scope: formData.get("scope"),
    state: formData.get("state"),
    city: formData.get("city"),
    is_facultative: formData.get("is_facultative"),
    description: formData.get("description"),
  });
}

export async function createHolidayAction(
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("settings");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await createHoliday(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o feriado. Tente novamente." };
  }

  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
  return {};
}

export async function updateHolidayAction(
  id: string,
  _prevState: HolidayFormState,
  formData: FormData
): Promise<HolidayFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await requireActionPermission("settings");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateHoliday(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar o feriado. Tente novamente." };
  }

  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
  return {};
}

export async function deleteHolidayAction(id: string): Promise<{ error?: string }> {
  try {
    await requireActionPermission("settings");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }
  const supabase = await createClient();
  try {
    await deleteHoliday(supabase, id);
  } catch {
    return { error: "Não foi possível excluir o feriado." };
  }
  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
  return {};
}
