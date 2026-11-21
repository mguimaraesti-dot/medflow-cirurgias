"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

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
  const hiddenRef = useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const parsed = parseCurrencyInput(raw);
    setDisplay(parsed !== null ? formatBRL(parsed) : "");
    // Atualiza o DOM diretamente (não via state) pra garantir que o valor
    // já esteja correto no input hidden antes do form ser enviado, mesmo
    // se o Enter disparar o submit antes do próximo render do React.
    if (hiddenRef.current) {
      hiddenRef.current.value = parsed !== null ? parsed.toFixed(2) : "";
    }
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
      <input
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={defaultValue != null ? defaultValue.toFixed(2) : ""}
      />
    </>
  );
}
