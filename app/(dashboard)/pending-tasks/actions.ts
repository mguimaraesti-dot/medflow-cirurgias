"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireActionPermission } from "@/lib/auth/guard";
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
    assigned_to: formData.get("assigned_to"),
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
  try {
    await requireActionPermission("pending_tasks");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await createTask(supabase, parsed.data);
  } catch {
    return { error: "Não foi possível criar a tarefa." };
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
  try {
    await requireActionPermission("pending_tasks");
  } catch {
    return { error: "Você não tem permissão para esta ação." };
  }

  const supabase = await createClient();
  try {
    await updateTask(supabase, id, parsed.data);
  } catch {
    return { error: "Não foi possível salvar a tarefa." };
  }

  revalidatePath("/pending-tasks");
  return {};
}

export async function setTaskStatusAction(id: string, status: Task["status"]) {
  await requireActionPermission("pending_tasks");
  const supabase = await createClient();
  await setTaskStatus(supabase, id, status);
  revalidatePath("/pending-tasks");
}
