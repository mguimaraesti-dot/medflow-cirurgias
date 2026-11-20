"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createTask, updateTask, setTaskStatus, type Task } from "@/lib/data/tasks";
import { taskSchema } from "@/lib/validation/tasks";

export type TaskFormState = { error?: string };

function parseForm(formData: FormData) {
  return taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority") || "normal",
    status: formData.get("status") || "open",
    due_date: formData.get("due_date"),
    surgery_id: formData.get("surgery_id"),
  });
}

export async function createTaskAction(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await createTask(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível criar a pendência." };
  }

  revalidatePath("/pending-tasks");
  return {};
}

export async function updateTaskAction(
  id: string,
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  try {
    await updateTask(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a pendência." };
  }

  revalidatePath("/pending-tasks");
  return {};
}

export async function setTaskStatusAction(id: string, status: Task["status"]) {
  const supabase = await createClient();
  await setTaskStatus(supabase, id, status);
  revalidatePath("/pending-tasks");
}
