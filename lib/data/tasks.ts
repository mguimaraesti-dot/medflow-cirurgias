import type { SupabaseClient } from "@supabase/supabase-js";

import type { TaskInput } from "@/lib/validation/tasks";

export type Task = {
  id: string;
  surgery_id: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_third_party" | "done" | "cancelled";
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  surgery: { id: string; code: string } | null;
};

export type TaskFilters = {
  category?: string;
  priority?: string;
  status?: string;
  q?: string;
};

const TASK_COLUMNS =
  "id,surgery_id,title,description,category,priority,status,due_date,completed_at,created_at,surgery:surgeries(id,code)";

export async function listTasks(supabase: SupabaseClient, filters: TaskFilters = {}) {
  let query = supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("title", `%${filters.q}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Task[];
}

export async function createTask(supabase: SupabaseClient, input: TaskInput) {
  const { error } = await supabase.from("tasks").insert(input);
  if (error) throw error;
}

export async function updateTask(supabase: SupabaseClient, id: string, input: TaskInput) {
  const { error } = await supabase.from("tasks").update(input).eq("id", id);
  if (error) throw error;
}

export async function setTaskStatus(supabase: SupabaseClient, id: string, status: Task["status"]) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}
