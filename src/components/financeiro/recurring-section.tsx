"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  RepeatIcon,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/financeiro/category-badge";
import { cn, formatCurrency } from "@/lib/utils";
import { useRecurringTransactions } from "@/hooks/use-recurring-transactions";
import { RECURRENCE_OPTIONS } from "@/lib/constants";

/** Converte a string RRULE para label legivel */
function rruleToLabel(rule: string | null | undefined): string {
  if (!rule) return "Sem regra";
  const normalized = rule.replace("RRULE:", "");
  const freq = normalized.split(";")[0];
  const found = RECURRENCE_OPTIONS.find((option) => option.value === freq);
  return found?.label ?? freq;
}

interface RecurringSectionProps {
  month: number;
  year: number;
  /** Callback chamado apos geracao bem-sucedida para atualizar a lista principal */
  onGenerated?: () => void;
}

/**
 * Secao "Recorrentes deste mes" na pagina de transacoes.
 * Mostra todas as transacoes pai recorrentes com status de geracao
 * e botao para gerar instancias do mes se ainda nao geradas.
 */
export function RecurringSection({
  month,
  year,
  onGenerated,
}: RecurringSectionProps) {
  const { parents, loading, error, generateForMonth, refresh } =
    useRecurringTransactions(month, year);

  const [expanded, setExpanded] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  async function handleGenerate(transactionId: string) {
    setGeneratingId(transactionId);
    try {
      const result = await generateForMonth(transactionId, month, year);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao gerar recorrentes");
        return;
      }
      if (result.totalCreated === 0) {
        toast.info("Todas as ocorrencias deste mes ja foram geradas");
      } else {
        toast.success(
          `${result.totalCreated} transacao${result.totalCreated !== 1 ? "es" : ""} gerada${result.totalCreated !== 1 ? "s" : ""}!`
        );
        onGenerated?.();
      }
    } finally {
      setGeneratingId(null);
    }
  }

  // Nao renderiza a secao se nao houver recorrentes e nao estiver carregando
  if (!loading && parents.length === 0) {
    return null;
  }

  const generatedCount = parents.filter((parent) => parent.generated).length;
  const pendingCount = parents.filter(
    (parent) => !parent.generated && parent.expectedCount > 0
  ).length;

  return (
    <div className="rounded-lg border bg-card">
      {/* Cabecalho colapsavel */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-1 py-1 hover:bg-muted/40 transition-colors"
          aria-expanded={expanded}
        >
          <div className="flex min-w-0 items-center gap-2">
            <RepeatIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-semibold text-sm">
              Recorrentes - {monthLabel}
            </span>
            {!loading && (
              <div className="ml-2 flex flex-wrap items-center gap-2">
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    <Clock className="h-2.5 w-2.5" />
                    {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                  </span>
                )}
                {generatedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {generatedCount} gerada{generatedCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={() => refresh()}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
          title="Recarregar"
          aria-label="Recarregar recorrentes"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Conteudo */}
      {expanded && (
        <div className="border-t">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando recorrentes...
            </div>
          ) : error ? (
            <div className="px-4 py-4 text-sm text-destructive">{error}</div>
          ) : (
            <div className="divide-y">
              {parents.map((parent) => {
                const isIncome = parent.type === "INCOME";
                const isGenerating = generatingId === parent.id;
                const occursThisMonth = parent.expectedCount > 0;

                return (
                  <div
                    key={parent.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    {/* Indicador de tipo */}
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        isIncome ? "bg-green-500" : "bg-red-500"
                      )}
                    />

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {parent.description}
                        </span>
                        <CategoryBadge category={parent.category} size="sm" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{rruleToLabel(parent.recurrenceRule)}</span>
                        <span
                          className={cn(
                            "font-semibold",
                            isIncome ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {isIncome ? "+" : "-"}
                          {formatCurrency(parent.amount)}
                        </span>
                        {occursThisMonth && (
                          <span>
                            {parent.instancesInMonth}/{parent.expectedCount} gerada
                            {parent.expectedCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status / Botao */}
                    <div className="shrink-0">
                      {!occursThisMonth ? (
                        <span className="text-xs italic text-muted-foreground">
                          Sem ocorrencia este mes
                        </span>
                      ) : parent.generated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Gerada
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerate(parent.id)}
                          disabled={isGenerating}
                          className="h-7 gap-1.5 border-amber-300 text-xs text-amber-700 hover:bg-amber-50"
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RepeatIcon className="h-3 w-3" />
                          )}
                          Gerar este mes
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
