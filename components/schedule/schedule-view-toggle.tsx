"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScheduleViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "month";

  function setView(next: "month" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "month") params.delete("view");
    else params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setView("month")}
        className={cn(view === "month" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
      >
        <CalendarDays className="h-4 w-4" />
        Mês
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setView("list")}
        className={cn(view === "list" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}
      >
        <List className="h-4 w-4" />
        Lista
      </Button>
    </div>
  );
}
