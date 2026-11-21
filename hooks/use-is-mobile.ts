"use client";

import { useEffect, useState } from "react";

/**
 * Abaixo de `md` (768px, mesmo breakpoint do Tailwind) várias telas
 * trocam de layout — board em abas em vez de colunas lado a lado,
 * calendário em pontinhos em vez de chips cheios, etc. Hook único pra
 * não duplicar a mesma lógica de matchMedia em cada tela.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
