"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RequirementTone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_BORDER: Record<RequirementTone, string> = {
  neutral: "border-border",
  info: "border-blue-200 dark:border-blue-900",
  warning: "border-amber-200 dark:border-amber-900",
  success: "border-emerald-200 dark:border-emerald-900",
  danger: "border-red-200 dark:border-red-900",
};

const TONE_ICON: Record<RequirementTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400",
  warning: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400",
  success: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400",
  danger: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400",
};

const TONE_BADGE_VARIANT: Record<RequirementTone, "outline" | "warning" | "success" | "destructive"> = {
  neutral: "outline",
  info: "outline",
  warning: "warning",
  success: "success",
  danger: "destructive",
};

const TONE_BADGE_CLASS: Record<RequirementTone, string> = {
  neutral: "",
  info: "border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400",
  warning: "",
  success: "",
  danger: "",
};

export function RequirementCardShell({
  icon: Icon,
  title,
  tone,
  statusLabel,
  summary,
  actionLabel,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: RequirementTone;
  statusLabel: string;
  summary?: React.ReactNode;
  actionLabel: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card transition-colors", TONE_BORDER[tone])}>
      <div className="flex items-center gap-3 p-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{title}</span>
            <Badge variant={TONE_BADGE_VARIANT[tone]} className={cn("px-1.5 py-0 text-[10px]", TONE_BADGE_CLASS[tone])}>
              {statusLabel}
            </Badge>
          </span>
          {summary ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{summary}</span> : null}
        </button>
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1 px-2.5 text-xs" onClick={onToggle}>
          {open ? "Fechar" : actionLabel}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open ? <div className="flex flex-col gap-4 border-t border-border p-4">{children}</div> : null}
    </div>
  );
}
