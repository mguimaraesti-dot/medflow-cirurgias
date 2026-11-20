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
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("kanban")}
        className={cn(view === "kanban" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
      >
        <KanbanSquare className="h-4 w-4" />
        Kanban
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("lista")}
        className={cn(view === "lista" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
      >
        <List className="h-4 w-4" />
        Lista
      </Button>
    </div>
  );
}
