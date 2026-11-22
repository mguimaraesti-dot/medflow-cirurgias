"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/input";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Aceita tanto "1000", "10.5" (ponto como decimal) quanto "1.000,50" ou
 * "1000,50" (formato brasileiro, com vírgula decimal). */
function parseCurrencyInput(raw: string): number | null {
  const trimmed = raw.replace(/[^\d.,-]/g, "").trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Campo de valor monetário: mostra "1.000,00" (padrão brasileiro) e, ao
 * sair do campo (Tab, clique fora) ou apertar Enter, reformata o que foi
 * digitado nesse padrão. Por baixo, mantém um input hidden com o valor em
 * formato numérico puro (ponto decimal) pra compatibilizar com o parsing
 * existente no servidor (Number(valor)).
 */
export function CurrencyInput({
  id,
  name,
  defaultValue,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: number | null;
  placeholder?: string;
}) {
  const [display, setDisplay] = useState(
    defaultValue != null ? formatBRL(defaultValue) : ""
  );

  // O valor enviado no formulário é sempre derivado do texto exibido, a
  // cada render (input oculto controlado pelo React). Antes o valor era
  // escrito direto no DOM a cada tecla, o que ficava frágil: o React
  // podia redefinir o campo oculto (reset do formulário após a action,
  // re-render) e o formulário seguia com o valor em branco. Derivar do
  // estado garante que o que aparece na tela é o que vai pro servidor.
  const parsedDisplay = parseCurrencyInput(display);
  const hiddenValue = parsedDisplay !== null ? parsedDisplay.toFixed(2) : "";

  function commit(raw: string) {
    const parsed = parseCurrencyInput(raw);
    setDisplay(parsed !== null ? formatBRL(parsed) : "");
  }

  return (
    <>
      <Input
        id={id}
        inputMode="decimal"
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={(e: FocusEvent<HTMLInputElement>) => commit(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
        }}
        placeholder={placeholder ?? "0,00"}
      />
      <input type="hidden" name={name} value={hiddenValue} readOnly />
    </>
  );
}
