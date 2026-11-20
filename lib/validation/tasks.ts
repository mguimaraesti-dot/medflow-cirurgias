import { z } from "zod";

const optionalText = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalDate = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().optional()
);

const optionalUuid = z.preprocess(
  (v) => (v === null || (typeof v === "string" && v.trim() === "") ? undefined : v),
  z.string().uuid().optional()
);

export const TASK_CATEGORIES = [
  "documentation",
  "hospital",
  "insurance",
  "materials",
  "or",
  "patient",
  "preoperative",
  "financial",
  "administrative",
] as const;

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const TASK_STATUSES = [
  "open",
  "in_progress",
  "waiting_third_party",
  "done",
  "cancelled",
] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à pendência."),
  description: optionalText,
  category: z.enum(TASK_CATEGORIES),
  priority: z.enum(TASK_PRIORITIES).default("normal"),
  status: z.enum(TASK_STATUSES).default("open"),
  due_date: optionalDate,
  surgery_id: optionalUuid,
});

export type TaskInput = z.infer<typeof taskSchema>;
