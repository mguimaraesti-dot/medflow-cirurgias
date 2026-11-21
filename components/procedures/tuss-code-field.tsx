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
  // Campo 1: código TUSS, sempre editável diretamente (quem já sabe o
  // código não precisa passar pela busca por nome).
  const [code, setCode] = useState(defaultCode ?? "");
  const [codeMatch, setCodeMatch] = useState<TussResult | null>(null);
  const [codeNotFound, setCodeNotFound] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const codeRequestIdRef = useRef(0);

  // Campo 2: busca por nome, sempre visível junto, para quem não sabe o
  // código de cor.
  const [query, setQuery] = useState(defaultQuery ?? "");
  const [results, setResults] = useState<TussResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const requestIdRef = useRef(0);

  // Só sobrescreve o campo Nome depois que o usuário efetivamente mexeu
  // nesses campos (digitou um código novo ou buscou/escolheu outro item).
  // Na primeira renderização de um registro já existente, a confirmação
  // automática do código salvo não deve apagar um nome que o usuário já
  // personalizou.
  const userInteractedRef = useRef(false);

  // O dropdown de resultados agora flutua por cima do resto do formulário
  // (como o de procedimentos na tela de cirurgia), em vez de empurrar os
  // campos abaixo pra dentro de uma caixinha de 160px — por isso precisa
  // fechar sozinho ao clicar fora.
  const [dismissed, setDismissed] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDismissed(true);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyName(name: string) {
    if (nameInputRef?.current) nameInputRef.current.value = name;
  }

  // Busca automática pelo código digitado direto no campo 1.
  useEffect(() => {
    const trimmed = code.trim();
    if (!/^\d{6,}$/.test(trimmed)) {
      codeRequestIdRef.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCodeMatch(null);
      setCodeNotFound(false);
      setCodePending(false);
      return;
    }
    const requestId = ++codeRequestIdRef.current;
    setCodePending(true);
    const timer = setTimeout(() => {
      searchTussCodesAction(trimmed).then((res) => {
        if (requestId !== codeRequestIdRef.current) return; // resposta obsoleta
        setCodePending(false);
        const match = res.results?.find((r) => r.code === trimmed) ?? null;
        setCodeMatch(match);
        setCodeNotFound(!match && !res.error);
        if (match && userInteractedRef.current) applyName(match.name);
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyName só lê a ref, é estável entre renders
  }, [code]);

  // Busca automática pelo nome digitado no campo 2, com debounce.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      requestIdRef.current++;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setError(null);
      setPending(false);
      setSlow(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setPending(true);
    setSlow(false);
    setError(null);
    setDismissed(false);
    const slowTimer = setTimeout(() => {
      if (requestId === requestIdRef.current) setSlow(true);
    }, 4000);
    const debounceTimer = setTimeout(() => {
      searchTussCodesAction(trimmed).then((res) => {
        clearTimeout(slowTimer);
        if (requestId !== requestIdRef.current) return; // resposta obsoleta
        setPending(false);
        setSlow(false);
        if (res.error) {
          setError(res.error);
          setResults(null);
        } else {
          setResults(res.results ?? []);
        }
      });
    }, 500);
    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(slowTimer);
    };
  }, [query]);

  function handlePick(result: TussResult) {
    userInteractedRef.current = true;
    setCode(result.code);
    setCodeMatch(result);
    setCodeNotFound(false);
    setResults(null);
    setQuery("");
    applyName(result.name);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tuss_code">Código TUSS</Label>
        <Input
          id="tuss_code"
          name="tuss_code"
          value={code}
          onChange={(e) => {
            userInteractedRef.current = true;
            setCode(e.target.value);
          }}
          placeholder="Ex: 40201082"
        />
        {codePending ? <p className="text-xs text-muted-foreground">Verificando código...</p> : null}
        {!codePending && codeMatch ? (
          <p
            className={
              codeMatch.active
                ? "text-xs text-emerald-600 dark:text-emerald-400"
                : "text-xs text-amber-600 dark:text-amber-400"
            }
          >
            ✓ {codeMatch.name}
            {!codeMatch.active ? " (código descontinuado na TUSS)" : ""}
          </p>
        ) : null}
        {!codePending && codeNotFound ? (
          <p className="text-xs text-muted-foreground">Código não encontrado na tabela TUSS.</p>
        ) : null}
      </div>

      <div ref={searchContainerRef} className="flex flex-col gap-1.5">
        <Label htmlFor="tuss_search" className="text-xs text-muted-foreground">
          Não sabe o código? Busque pelo nome
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tuss_search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setDismissed(false)}
            placeholder="Buscar na tabela TUSS (ANS) pelo nome..."
            className="pl-7"
            autoComplete="off"
          />

          {/* A lista de resultados flutua por cima do resto do formulário
           * (não empurra mais os campos abaixo pra dentro de uma caixinha
           * minúscula) — e ganha bem mais altura e linhas maiores, fáceis
           * de tocar no celular. */}
          {results && !dismissed ? (
            results.length === 0 ? (
              <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-md">
                <p className="text-sm text-muted-foreground">Nenhum procedimento encontrado na TUSS.</p>
              </div>
            ) : (
              <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                {results.map((result) => (
                  <li key={result.code} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => handlePick(result)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                    >
                      <span
                        className={
                          result.active ? "text-foreground" : "text-muted-foreground line-through"
                        }
                      >
                        {result.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{result.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>

        {pending ? (
          <p className="text-xs text-muted-foreground">
            {slow ? "Ainda buscando, a base da ANS pode demorar alguns segundos..." : "Buscando..."}
          </p>
        ) : null}
        {!pending && query.trim().length > 0 && query.trim().length < 3 ? (
          <p className="text-xs text-muted-foreground">Digite ao menos 3 letras.</p>
        ) : null}
        {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
