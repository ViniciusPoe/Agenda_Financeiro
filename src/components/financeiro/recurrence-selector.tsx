"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECURRENCE_OPTIONS } from "@/lib/constants";
import { cn, toDateOnlyString } from "@/lib/utils";

/**
 * Mapeia a frequência RRULE para texto legível em PT-BR.
 * Usado para mostrar uma descrição amigável da regra configurada.
 */
function rruleToReadableText(rule: string | undefined): string {
  if (!rule) return "";
  const freq = rule.replace("RRULE:", "").split(";")[0];
  switch (freq) {
    case "FREQ=DAILY":
      return "Repete diariamente";
    case "FREQ=WEEKLY":
      return "Repete semanalmente";
    case "FREQ=MONTHLY":
      return "Repete mensalmente";
    case "FREQ=YEARLY":
      return "Repete anualmente";
    default:
      return "Recorrencia personalizada";
  }
}

interface RecurrenceSelectorProps {
  /** Valor atual da regra RRULE (ex: "FREQ=MONTHLY") */
  value: string | undefined;
  /** Data de encerramento em formato YYYY-MM-DD */
  endDate: string | undefined;
  /** Callback ao mudar a frequência */
  onValueChange: (value: string) => void;
  /** Callback ao mudar a data de encerramento */
  onEndDateChange: (date: string) => void;
  className?: string;
}

/**
 * Seletor de recorrência para o formulário de transações financeiras.
 * Exibe seleção de frequência e campo de data de encerramento opcional,
 * com texto legível em PT-BR da regra configurada.
 */
export function RecurrenceSelector({
  value,
  endDate,
  onValueChange,
  onEndDateChange,
  className,
}: RecurrenceSelectorProps) {
  const readableText = rruleToReadableText(value);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-4">
        {/* Frequencia */}
        <div className="space-y-1.5">
          <Label>Frequencia *</Label>
          <Select
            value={value || ""}
            onValueChange={(val) => onValueChange(val ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {RECURRENCE_OPTIONS.find((o) => o.value === value)?.label ?? "Selecione a frequencia"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RECURRENCE_OPTIONS.filter((o) => o.value !== "").map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data de encerramento */}
        <div className="space-y-1.5">
          <Label htmlFor="recurrence-end">Termina em</Label>
          <Input
            id="recurrence-end"
            type="date"
            value={endDate ?? ""}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={toDateOnlyString(new Date())}
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco para sem data de encerramento
          </p>
        </div>
      </div>

      {/* Texto legivel da regra */}
      {readableText && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
          {readableText}
          {endDate && (
            <span className="text-blue-600">
              {" "}ate{" "}
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date(endDate + "T12:00:00"))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
