import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Clock } from "lucide-react";

interface BalanceCardProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingCount: number;
  month: number;
  year: number;
}

export function BalanceCard({
  totalIncome,
  totalExpense,
  balance,
  pendingCount,
  month,
  year,
}: BalanceCardProps) {
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );

  const isPositive = balance >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Saldo atual — destaque */}
      <Card className={cn(
        "col-span-2 md:col-span-2 border-2",
        isPositive ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
      )}>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Saldo de {monthName} de {year}
              </p>
              <p
                className={cn(
                  "text-3xl font-bold mt-1",
                  isPositive ? "text-green-700" : "text-red-700"
                )}
              >
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isPositive ? "Saldo positivo" : "Saldo negativo"}
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                isPositive ? "bg-green-100" : "bg-red-100"
              )}
            >
              <Wallet
                className={cn(
                  "h-6 w-6",
                  isPositive ? "text-green-700" : "text-red-700"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receitas */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receitas</p>
              <p className="text-xl font-bold mt-1 text-green-600">
                {formatCurrency(totalIncome)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Este mes</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Despesas</p>
              <p className="text-xl font-bold mt-1 text-red-600">
                {formatCurrency(totalExpense)}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                </p>
              )}
              {pendingCount === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              )}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
