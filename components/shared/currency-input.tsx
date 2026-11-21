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

  // Mantém o input oculto sempre em dia com o que foi digitado, a cada
  // tecla — não só no blur/Enter. Assim, se o clique em "Salvar" acontecer
  // antes do navegador disparar o blur do campo, o valor já está lá mesmo
  // assim; o blur/Enter só cuida de deixar o texto visível bonito.
  function syncHidden(raw: string) {
    const parsed = parseCurrencyInput(raw);
    if (hiddenRef.current) {
      hiddenRef.current.value = parsed !== null ? parsed.toFixed(2) : "";
    }
  }

  function commit(raw: string) {
    const parsed = parseCurrencyInput(raw);
    setDisplay(parsed !== null ? formatBRL(parsed) : "");
    syncHidden(raw);
  }

  return (
    <>
      <Input
        id={id}
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          setDisplay(e.target.value);
          syncHidden(e.target.value);
        }}
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
