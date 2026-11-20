"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Dispara um toast de sucesso/erro sempre que o resultado de uma
 * `useActionState` mudar (ou seja, depois de um submit real) — nunca na
 * primeira renderização, para não mostrar feedback de "salvo" ao carregar
 * a página.
 */
export function useActionToast<T extends { error?: string }>(
  state: T,
  successMessage: string
) {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (state.error) {
      toast.error(state.error);
    } else {
      toast.success(successMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
