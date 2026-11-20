"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { KanbanSquare, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "lista" ? "lista" : "kanban";

  function setView(next: "kanban" | "lista") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "kanban") params.delete("view");
    else params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("kanban")}
        className={cn(view === "kanban" && "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50")}
      >
        <KanbanSquare className="h-4 w-4" />
        Kanban
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("lista")}
        className={cn(view === "lista" && "bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50")}
      >
        <List className="h-4 w-4" />
        Lista
      </Button>
    </div>
  );
}
