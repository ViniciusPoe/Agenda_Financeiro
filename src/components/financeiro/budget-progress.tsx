import { cn, formatCurrency } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface BudgetProgressProps {
  label: string;
  color?: string;
  spent: number;
  limit: number | null;
  percentage: number | null;
  showAlert?: boolean;
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 90) return "bg-red-400";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

function getProgressTextColor(pct: number): string {
  if (pct >= 90) return "text-red-600";
  if (pct >= 70) return "text-yellow-600";
  return "text-green-600";
}

export function BudgetProgress({
  label,
  color,
  spent,
  limit,
  percentage,
  showAlert = true,
}: BudgetProgressProps) {
  const pct = percentage ?? 0;
  const isOverBudget = pct >= 100;
  const isWarning = pct >= 70 && pct < 100;
  const hasLimit = limit !== null && limit > 0;

  return (
    <div className={cn(
      "rounded-lg border p-4 space-y-3",
      isOverBudget && "border-red-200 bg-red-50/50",
      isWarning && "border-yellow-200 bg-yellow-50/50"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {color && (
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          <span className="font-medium text-sm truncate">{label}</span>
          {showAlert && (isOverBudget || isWarning) && (
            <AlertTriangle
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isOverBudget ? "text-red-500" : "text-yellow-500"
              )}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-sm">
          <span className={cn("font-semibold", hasLimit ? getProgressTextColor(pct) : "text-muted-foreground")}>
            {formatCurrency(spent)}
          </span>
          {hasLimit && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{formatCurrency(limit!)}</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {hasLimit && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                getProgressColor(pct)
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={cn("font-medium", getProgressTextColor(pct))}>
              {pct}% utilizado
            </span>
            <span>
              {isOverBudget
                ? `${formatCurrency(spent - limit!)} acima do limite`
                : `${formatCurrency(limit! - spent)} restante`}
            </span>
          </div>
        </div>
      )}

      {!hasLimit && (
        <p className="text-xs text-muted-foreground">Sem limite definido para esta categoria</p>
      )}
    </div>
  );
}
