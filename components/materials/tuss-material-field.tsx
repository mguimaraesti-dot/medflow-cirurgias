"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Search } from "lucide-react";

import { searchTussMaterialsAction } from "@/app/(dashboard)/catalog/materials/actions";
import type { TussResult } from "@/lib/tuss";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function MetaLine({ match }: { match: TussResult }) {
  const parts = [
    match.manufacturer ? `Fabricante: ${match.manufacturer}` : null,
    match.model ? `Modelo: ${match.model}` : null,
    match.anvisaRegistration ? `Registro ANVISA: ${match.anvisaRegistration}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>;
}

export function TussMaterialField({
  defaultCode,
  defaultQuery,
  defaultManufacturer,
  defaultModel,
  defaultAnvisaRegistration,
  nameInputRef,
}: {
  defaultCode?: string | null;
  defaultQuery?: string;
  defaultManufacturer?: string | null;
  defaultModel?: string | null;
  defaultAnvisaRegistration?: string | null;
  /** Ref do campo Nome do formulário — preenchido automaticamente só se
   * ainda estiver vazio quando o usuário escolher um resultado da busca. */
  nameInputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [code, setCode] = useState(defaultCode ?? "");
  // Começa com o que já estava salvo (quando editando), pra nunca mandar o
  // formulário com fabricante/modelo/ANVISA em branco só porque a consulta
  // em segundo plano ainda não voltou (ou falhou) — só troca quando uma
  // busca realmente confirmar um resultado novo.
  const [codeMatch, setCodeMatch] = useState<TussResult | null>(
    defaultCode
      ? {
          code: defaultCode,
          name: defaultQuery ?? "",
          active: true,
          manufacturer: defaultManufacturer ?? undefined,
          model: defaultModel ?? undefined,
          anvisaRegistration: defaultAnvisaRegistration ?? undefined,
        }
      : null
  );
  const [codeNotFound, setCodeNotFound] = useState(false);
  const [codePending, setCodePending] = useState(false);
  const codeRequestIdRef = useRef(0);

  const [query, setQuery] = useState(defaultQuery ?? "");
  const [results, setResults] = useState<TussResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const requestIdRef = useRef(0);

  function fillNameIfEmpty(name: string) {
    if (nameInputRef?.current && !nameInputRef.current.value.trim()) {
      nameInputRef.current.value = name;
    }
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
      searchTussMaterialsAction(trimmed).then((res) => {
        if (requestId !== codeRequestIdRef.current) return;
        setCodePending(false);
        if (res.error) {
          // Falha de rede/timeout — não mexe no que já estava (nem limpa,
          // nem marca como "não encontrado"), pra não arriscar apagar
          // fabricante/ANVISA que já estavam salvos.
          return;
        }
        const match = res.results?.find((r) => r.code === trimmed) ?? null;
        setCodeMatch(match);
        setCodeNotFound(!match);
        if (match) fillNameIfEmpty(match.name);
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fillNameIfEmpty só lê a ref, é estável entre renders
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
    const slowTimer = setTimeout(() => {
      if (requestId === requestIdRef.current) setSlow(true);
    }, 4000);
    const debounceTimer = setTimeout(() => {
      searchTussMaterialsAction(trimmed).then((res) => {
        clearTimeout(slowTimer);
        if (requestId !== requestIdRef.current) return;
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
    setCode(result.code);
    setCodeMatch(result);
    setCodeNotFound(false);
    setResults(null);
    setQuery("");
    fillNameIfEmpty(result.name);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tuss_code">Código TUSS (Tabela 19 — Materiais/OPME)</Label>
        <Input
          id="tuss_code"
          name="tuss_code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex: 71255087"
        />
        {codePending ? <p className="text-xs text-muted-foreground">Verificando código...</p> : null}
        {!codePending && codeMatch ? (
          <>
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
            <MetaLine match={codeMatch} />
          </>
        ) : null}
        {!codePending && codeNotFound ? (
          <p className="text-xs text-muted-foreground">Código não encontrado na tabela TUSS.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tuss_material_search" className="text-xs text-muted-foreground">
          Não sabe o código? Busque pelo nome
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tuss_material_search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na tabela TUSS (ANS) pelo nome..."
            className="pl-7 text-xs"
          />
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

        {results ? (
          results.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum material encontrado na TUSS.</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto rounded-md border border-border">
              {results.map((result) => (
                <li key={result.code}>
                  <button
                    type="button"
                    onClick={() => handlePick(result)}
                    className="flex w-full flex-col gap-0.5 px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className={result.active ? "text-foreground" : "text-muted-foreground line-through"}>
                        {result.name}
                      </span>
                      <span className="shrink-0 text-muted-foreground">{result.code}</span>
                    </span>
                    {result.manufacturer ? (
                      <span className="text-muted-foreground">{result.manufacturer}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      <input type="hidden" name="manufacturer" value={codeMatch?.manufacturer ?? ""} />
      <input type="hidden" name="model" value={codeMatch?.model ?? ""} />
      <input type="hidden" name="anvisa_registration" value={codeMatch?.anvisaRegistration ?? ""} />
    </div>
  );
}
