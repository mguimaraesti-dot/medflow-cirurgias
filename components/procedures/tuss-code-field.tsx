"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Search } from "lucide-react";

import { searchTussCodesAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { TussResult } from "@/lib/tuss";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TussCodeField({
  defaultCode,
  defaultQuery,
  nameInputRef,
}: {
  defaultCode?: string | null;
  defaultQuery?: string;
  /** Ref do campo Nome do formulário — usado só para preencher o nome
   * automaticamente quando ele ainda estiver vazio e o usuário escolher
   * um resultado da busca. Nunca sobrescreve um nome já digitado. */
  nameInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [code, setCode] = useState(defaultCode ?? "");
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [results, setResults] = useState<TussResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Contador para ignorar respostas de buscas antigas que chegam depois de
  // uma busca mais recente (evita sobrescrever o resultado atual com um
  // resultado desatualizado quando o usuário digita rápido).
  const requestIdRef = useRef(0);

  function runSearch(term: string) {
    const requestId = ++requestIdRef.current;
    setError(null);
    setPending(true);
    searchTussCodesAction(term).then((res) => {
      if (requestId !== requestIdRef.current) return; // resposta obsoleta
      setPending(false);
      if (res.error) {
        setError(res.error);
        setResults(null);
      } else {
        setResults(res.results ?? []);
      }
    });
  }

  // Busca automática conforme digita, com debounce de 500ms.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      requestIdRef.current++; // invalida qualquer busca em andamento
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setError(null);
      setPending(false);
      return;
    }
    const timer = setTimeout(() => runSearch(trimmed), 500);
    return () => clearTimeout(timer);
  }, [query]);

  function handlePick(result: TussResult) {
    setCode(result.code);
    setResults(null);
    if (nameInputRef?.current && !nameInputRef.current.value.trim()) {
      nameInputRef.current.value = result.name;
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="tuss_code">Código TUSS</Label>
      <Input
        id="tuss_code"
        name="tuss_code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Ex: 40201082"
      />

      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const trimmed = query.trim();
              if (trimmed.length >= 3) runSearch(trimmed);
            }
          }}
          placeholder="Buscar na tabela TUSS (ANS) pelo nome..."
          className="pl-7 text-xs"
        />
      </div>
      {pending ? <p className="text-xs text-muted-foreground">Buscando...</p> : null}
      {!pending && query.trim().length > 0 && query.trim().length < 3 ? (
        <p className="text-xs text-muted-foreground">Digite ao menos 3 letras.</p>
      ) : null}

      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

      {results ? (
        results.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum procedimento encontrado na TUSS.</p>
        ) : (
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
            {results.map((result) => (
              <li key={result.code}>
                <button
                  type="button"
                  onClick={() => handlePick(result)}
                  className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  <span className={result.active ? "text-foreground" : "text-muted-foreground line-through"}>
                    {result.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{result.code}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
