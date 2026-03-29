import { formatCurrency } from "@/lib/utils";

interface CategorySummaryItem {
  categoryId: string;
  name: string;
  color: string;
  total: string;
  count: number;
}

interface MonthlySummaryProps {
  data: CategorySummaryItem[];
  totalExpense: number;
}

export function MonthlySummary({ data, totalExpense }: MonthlySummaryProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma despesa no periodo
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((item) => {
        const amount = parseFloat(item.total);
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;

        return (
          <div key={item.categoryId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({item.count})
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}

      <div className="pt-2 border-t flex justify-between text-sm font-semibold">
        <span>Total</span>
        <span className="text-red-600">{formatCurrency(totalExpense)}</span>
      </div>
    </div>
  );
}
