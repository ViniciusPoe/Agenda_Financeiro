"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BarChart2, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BalanceCard } from "@/components/financeiro/balance-card";
import { ExpenseChart } from "@/components/financeiro/expense-chart";
import { IncomeVsExpense } from "@/components/financeiro/income-vs-expense";
import { MonthlySummary } from "@/components/financeiro/monthly-summary";
import { CategoryBadge } from "@/components/financeiro/category-badge";
import { StatsSkeleton, ListSkeleton } from "@/components/shared/loading-skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn, formatCurrency, formatDate, toDateOnlyString } from "@/lib/utils";
import type { Transaction } from "@/types/financeiro";

interface BalanceData {
  month: number;
  year: number;
  totalIncome: string;
  totalExpense: string;
  balance: string;
  pendingCount: number;
}

interface ReportData {
  summary: {
    totalIncome: string;
    totalExpense: string;
    balance: string;
    count: number;
  };
  byCategory: Array<{
    categoryId: string;
    name: string;
    color: string;
    total: string;
    count: number;
  }>;
  byMonth: Array<{
    month: number;
    year: number;
    income: string;
    expense: string;
    balance: string;
  }>;
}

export default function FinanceiroDashboardPage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadingBalance(true);
      setLoadingReport(true);
      setLoadingTransactions(true);

      const dateFrom = toDateOnlyString(new Date(year, month - 1, 1));
      const dateTo = toDateOnlyString(new Date(year, month, 0));

      const [balanceRes, reportRes, transactionsRes] = await Promise.allSettled([
        fetch(`/api/financeiro/saldo?month=${month}&year=${year}`).then((r) =>
          r.json()
        ),
        fetch(`/api/financeiro/relatorios?month=${month}&year=${year}`).then(
          (r) => r.json()
        ),
        fetch(
          `/api/financeiro/transacoes?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=5&page=1`
        ).then((r) => r.json()),
      ]);

      if (cancelled) return;

      if (balanceRes.status === "fulfilled" && balanceRes.value.data) {
        setBalanceData(balanceRes.value.data);
      }
      if (reportRes.status === "fulfilled" && reportRes.value.data) {
        setReportData(reportRes.value.data);
      }
      if (
        transactionsRes.status === "fulfilled" &&
        transactionsRes.value.data
      ) {
        setRecentTransactions(transactionsRes.value.data);
      }

      setLoadingBalance(false);
      setLoadingReport(false);
      setLoadingTransactions(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            Resumo de {monthName} de {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/financeiro/transacoes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <BarChart2 className="h-4 w-4" />
            Transacoes
          </Link>
          <Link
            href="/financeiro/transacoes/nova"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Plus className="h-4 w-4" />
            Nova transacao
          </Link>
        </div>
      </div>

      {/* Balance cards */}
      {loadingBalance ? (
        <StatsSkeleton />
      ) : balanceData ? (
        <BalanceCard
          totalIncome={parseFloat(balanceData.totalIncome)}
          totalExpense={parseFloat(balanceData.totalExpense)}
          balance={parseFloat(balanceData.balance)}
          pendingCount={balanceData.pendingCount}
          month={balanceData.month}
          year={balanceData.year}
        />
      ) : (
        <div className="text-sm text-muted-foreground">Nao foi possivel carregar o saldo.</div>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Donut — despesas por categoria */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Despesas por categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReport ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ExpenseChart data={reportData?.byCategory ?? []} />
            )}
          </CardContent>
        </Card>

        {/* Bar — receitas vs despesas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Receitas vs Despesas (ultimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReport ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <IncomeVsExpense data={reportData?.byMonth ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: resumo + ultimas transacoes */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Resumo por categoria */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReport ? (
              <ListSkeleton count={3} />
            ) : (
              <MonthlySummary
                data={reportData?.byCategory ?? []}
                totalExpense={parseFloat(reportData?.summary.totalExpense ?? "0")}
              />
            )}
          </CardContent>
        </Card>

        {/* Ultimas transacoes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ultimas transacoes</CardTitle>
              <Link
                href="/financeiro/transacoes"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <ListSkeleton count={3} />
            ) : recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma transacao este mes.
              </p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {t.type === "INCOME" ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        )}
                        <p className="text-sm font-medium truncate">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CategoryBadge category={t.category} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(t.date)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-bold text-sm shrink-0",
                        t.type === "INCOME" ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
