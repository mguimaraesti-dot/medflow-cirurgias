import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onClick, ...props }, ref) => {
    const isDate = type === "date";
    return (
      <input
        type={type}
        // Campo de data: clicar em qualquer ponto abre o calendário (e não só no ícone).
        onClick={(e) => {
          onClick?.(e);
          if (isDate && !e.defaultPrevented && !props.disabled && !props.readOnly) {
            try {
              e.currentTarget.showPicker?.();
            } catch {
              // navegador sem showPicker ou sem gesto do usuário: o ícone nativo continua valendo
            }
          }
        }}
        className={cn(
          isDate && "min-w-[9.5rem] cursor-pointer",
          "flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
