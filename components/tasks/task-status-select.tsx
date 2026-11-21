"use client";

import { useTransition } from "react";

import { setTaskStatusAction } from "@/app/(dashboard)/pending-tasks/actions";
import type { Task } from "@/lib/data/tasks";
import { TASK_STATUSES } from "@/lib/validation/tasks";
import { STATUS_LABEL } from "@/components/tasks/task-filters";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_VARIANT: Record<Task["status"], "info" | "warning" | "secondary" | "success" | "destructive"> = {
  open: "info",
  in_progress: "warning",
  waiting_third_party: "secondary",
  done: "success",
  cancelled: "destructive",
};

export function TaskStatusSelect({ task }: { task: Task }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={task.status}
      disabled={pending}
      onValueChange={(status) =>
        startTransition(() => setTaskStatusAction(task.id, status as Task["status"]))
      }
    >
      <SelectTrigger className="h-8 w-[170px] justify-start gap-1.5 border-transparent bg-transparent px-1 text-xs shadow-none hover:border-border">
        <SelectValue>
          <Badge variant={STATUS_VARIANT[task.status]}>{STATUS_LABEL[task.status]}</Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABEL[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
