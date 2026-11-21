"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Search, Check, X, Pencil } from "lucide-react";

import { searchTussCodesAction } from "@/app/(dashboard)/catalog/procedures/actions";
import type { TussResult } from "@/lib/tuss";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Selected = { code: string; name: string | null };

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
  // Já existe um código salvo (edição) mas ainda não sabemos o nome TUSS
  // correspondente até a primeira busca confirmar — por isso começamos
  // "selecionado" quando há defaultCode, mostrando o código até achar o nome.
  const [selected, setSelected] = useState<Selected | null>(
    defaultCode ? { code: defaultCode, name: null } : null
  );
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState(defaultCode ?? "");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TussResult[] | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function fillNameIfEmpty(name: string) {
    if (nameInputRef?.current && !nameInputRef.current.value.trim()) {
      nameInputRef.current.value = name;
    }
  }

  // Ao editar um procedimento que já tem código TUSS, busca o nome
  // correspondente uma vez (pelo próprio código) só para exibir a
  // confirmação "✓ <nome>" — não refaz a busca depois disso.
  useEffect(() => {
    if (!defaultCode) return;
    searchTussCodesAction(defaultCode).then((res) => {
      const match = res.results?.find((r) => r.code === defaultCode);
      if (match) setSelected({ code: match.code, name: match.name });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca automática conforme digita (nome OU código), com debounce.
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

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePick(result: TussResult) {
    setSelected({ code: result.code, name: result.name });
    setQuery("");
    setResults(null);
    setOpen(false);
    fillNameIfEmpty(result.name);
  }

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setResults(null);
  }

  if (manual) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tuss_code">Código TUSS</Label>
          <button
            type="button"
            onClick={() => {
              setManual(false);
              setSelected(manualCode ? { code: manualCode, name: null } : null);
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Buscar na tabela TUSS
          </button>
        </div>
        <Input
          id="tuss_code"
          name="tuss_code"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Ex: 40201082"
        />
        <p className="text-xs text-muted-foreground">
          Informado manualmente — não validado contra a tabela da ANS.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <Label htmlFor="tuss_search">Procedimento (TUSS)</Label>

      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <span className="font-medium">{selected.code}</span>
              {selected.name ? <span className="text-muted-foreground"> — {selected.name}</span> : null}
            </span>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Trocar procedimento TUSS"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="tuss_search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={defaultQuery ? `Ex: ${defaultQuery}` : "Digite o nome ou o código TUSS..."}
            className="pl-7"
            autoComplete="off"
          />

          {open && (results || pending || error) ? (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
              {pending ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  {slow ? "Ainda buscando, a base da ANS pode demorar alguns segundos..." : "Buscando..."}
                </p>
              ) : error ? (
                <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>
              ) : results && results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Nenhum procedimento encontrado na TUSS.
                </p>
              ) : (
                <ul className="max-h-48 overflow-y-auto">
                  {results?.map((result) => (
                    <li key={result.code}>
                      <button
                        type="button"
                        onClick={() => handlePick(result)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                      >
                        <span
                          className={result.active ? "text-foreground" : "text-muted-foreground line-through"}
                        >
                          {result.name}
                        </span>
                        <span className="shrink-0 text-muted-foreground">{result.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      )}

      {!selected ? (
        <p className="text-xs text-muted-foreground">
          Digite ao menos 3 letras (nome ou código). Se não encontrar,{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs"
            onClick={() => setManual(true)}
          >
            <Pencil className="mr-1 h-3 w-3" />
            informe o código manualmente
          </Button>
          .
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setManual(true)}
          className="self-start text-xs text-muted-foreground underline hover:text-foreground"
        >
          Editar código manualmente
        </button>
      )}

      {/* Valor real submetido no formulário */}
      <input type="hidden" name="tuss_code" value={selected?.code ?? ""} />
    </div>
  );
}
