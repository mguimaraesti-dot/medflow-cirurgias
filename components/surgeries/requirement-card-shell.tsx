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
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border bg-card shadow-sm transition-colors",
        // Aberto: ocupa a linha inteira (os vizinhos não esticam).
        open && "lg:col-span-2",
        TONE_BORDER[tone]
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE_ICON[tone])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{title}</p>
              <Badge variant={TONE_BADGE_VARIANT[tone]} className={TONE_BADGE_CLASS[tone]}>
                {statusLabel}
              </Badge>
            </div>
            {summary ? (
              <div className="mt-1 text-sm text-muted-foreground">{summary}</div>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {!open ? (
        <div className="mt-auto px-4 pb-4">
          <Button type="button" variant="outline" size="sm" onClick={onToggle}>
            {actionLabel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border p-4">{children}</div>
      )}
    </div>
  );
}
