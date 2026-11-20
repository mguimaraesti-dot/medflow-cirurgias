"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/**
 * Wrapper do toaster (sonner) que acompanha o tema claro/escuro do app.
 * Como o tema é alternado via classe `.dark` no `<html>` (sem next-themes),
 * observamos a classe diretamente para que os toasts fiquem no tema certo
 * mesmo quando alternados em outra parte da tela (ex: rodapé do menu).
 */
export function AppToaster() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="bottom-right"
      richColors
      closeButton
    />
  );
}
