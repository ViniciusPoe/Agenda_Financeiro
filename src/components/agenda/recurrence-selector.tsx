"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { RECURRENCE_OPTIONS } from "@/lib/constants";
import { parseRRuleToLabel } from "@/hooks/use-recurrence";
import { cn } from "@/lib/utils";
import { RepeatIcon } from "lucide-react";

interface RecurrenceSelectorProps {
  value: string | undefined;
  recurrenceEnd: string | undefined;
  onChange: (rule: string | undefined) => void;
  onEndChange: (date: string | undefined) => void;
  /** Data base do evento para calcular o minimo de data de encerramento */
  baseDate?: string;
}

export function RecurrenceSelector({
  value,
  recurrenceEnd,
  onChange,
  onEndChange,
  baseDate,
}: RecurrenceSelectorProps) {
  const label = value ? parseRRuleToLabel(value) : "";

  function handleRuleChange(selected: string | null) {
    const rule = selected === "none" || !selected ? undefined : selected;
    onChange(rule);

    // Se removeu a recorrencia, limpa tambem a data de encerramento
    if (!rule) {
      onEndChange(undefined);
    }
  }

  const hasRecurrence = !!value;
  const selectedRecurrenceLabel =
    RECURRENCE_OPTIONS.find((option) => option.value === value)?.label ??
    "Nao repetir";

  return (
    <div className="space-y-3">
      {/* Selector de frequencia */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <RepeatIcon className="h-3.5 w-3.5 text-muted-foreground" />
          Recorrencia
        </Label>
        <Select
          value={value ?? "none"}
          onValueChange={handleRuleChange}
        >
          <SelectTrigger className="w-full">
            <span
              data-slot="select-value"
              className={cn(
                "flex flex-1 text-left",
                !hasRecurrence && "text-muted-foreground"
              )}
            >
              {selectedRecurrenceLabel}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nao repetir</SelectItem>
            {RECURRENCE_OPTIONS.filter((option) => option.value !== "").map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Texto legivel da regra selecionada + data de encerramento */}
      {hasRecurrence && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 space-y-3">
          {/* Preview em texto */}
          {label && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{label}</span>
              {recurrenceEnd && (
                <span>
                  {" - ate "}
                  {new Date(recurrenceEnd + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "long", year: "numeric" }
                  )}
                </span>
              )}
            </p>
          )}

          {/* Data de encerramento */}
          <div className="space-y-1.5">
            <Label
              htmlFor="recurrenceEnd"
              className="text-xs font-normal text-muted-foreground"
            >
              Encerrar em (opcional)
            </Label>
            <Input
              id="recurrenceEnd"
              type="date"
              value={recurrenceEnd ?? ""}
              min={baseDate}
              onChange={(e) => onEndChange(e.target.value || undefined)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
