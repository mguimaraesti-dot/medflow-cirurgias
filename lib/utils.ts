import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Data de "hoje" (YYYY-MM-DD) no fuso de Brasília — não o fuso do servidor
 * nem do navegador. Importa porque o app roda tanto no navegador do
 * usuário (fuso local, já é America/Sao_Paulo na prática) quanto em
 * funções do servidor na Vercel (sempre UTC): usar `new Date().toISOString()`
 * direto pra "hoje" fica ~3h adiantado todo fim de dia (21h-meia-noite em
 * Brasília já é o dia seguinte em UTC), o que fazia cirurgias previstas
 * pra hoje aparecerem como "atrasada" nesse intervalo. Com o fuso fixo,
 * o resultado é sempre o mesmo não importa onde o código rodar.
 */
export function todayInSaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
