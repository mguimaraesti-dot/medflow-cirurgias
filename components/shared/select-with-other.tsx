"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OTHER = "__outro__";

/**
 * Select com lista sugerida + opção "Outro" que revela um campo de texto
 * livre. O valor enviado no FormData é sempre uma string simples sob o
 * mesmo `name`, seja ela uma das opções da lista ou o texto digitado.
 */
export function SelectWithOther({
  name,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
  placeholder: string;
}) {
  const isCustomInitially = !!defaultValue && !options.includes(defaultValue);
  const [mode, setMode] = useState<string>(isCustomInitially ? OTHER : defaultValue ?? "");
  const [customValue, setCustomValue] = useState(isCustomInitially ? defaultValue ?? "" : "");

  return (
    <div className="flex flex-col gap-2">
      <Select value={mode} onValueChange={setMode}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Outro (especificar)</SelectItem>
        </SelectContent>
      </Select>
      {mode === OTHER ? (
        <Input
          name={name}
          placeholder="Especifique"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
        />
      ) : (
        <input type="hidden" name={name} value={mode} />
      )}
    </div>
  );
}
