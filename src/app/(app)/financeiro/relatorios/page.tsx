"use client";

import { type ElementType, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseChart } from "@/components/financeiro/expense-chart";
import { IncomeVsExpense } from "@/components/financeiro/income-vs-expense";
import { MonthlySummary } from "@/components/financeiro/monthly-summary";
import { CategoryBadge } from "@/components/financeiro/category-badge";
import { ListSkeleton, StatsSkeleton } from "@/components/shared/loading-skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn, formatCurrency, getMonthName } from "@/lib/utils";

type PeriodMode = "month" | "year";

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

interface MetricCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ElementType;
  valueClassName?: string;
  iconClassName?: string;
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  valueClassName,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-2xl font-bold", valueClassName)}>{value}</p>
            <p className="text-xs text-muted-foreground">{helper}</p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted",
              iconClassName
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMonthYear(month: number, year: number) {
  return `${getMonthName(month)} de ${year}`;
}

export default function RelatoriosPage() {
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (mode: PeriodMode, activeMonth: number, activeYear: number) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ year: String(activeYear) });
        if (mode === "month") {
          params.set("month", String(activeMonth));
        }

        const res = await fetch(`/api/financeiro/relatorios?${params.toString()}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error ?? "Erro ao carregar relatorios");
          setReportData(null);
          return;
        }

        setReportData(json.data ?? null);
      } catch {
        setError("Erro ao carregar relatorios");
        setReportData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchReports(periodMode, month, year);
  }, [fetchReports, month, periodMode, year]);

  function handleShiftPeriod(direction: -1 | 1) {
    if (periodMode === "year") {
      setYear((currentYear) => currentYear + direction);
      return;
    }

    const nextDate = new Date(year, month - 1 + direction, 1);
    setMonth(nextDate.getMonth() + 1);
    setYear(nextDate.getFullYear());
  }

  function handleResetPeriod() {
    const currentDate = new Date();
    setMonth(currentDate.getMonth() + 1);
    setYear(currentDate.getFullYear());
  }

  const periodLabel =
    periodMode === "month" ? formatMonthYear(month, year) : `Ano de ${year}`;

  const totalIncome = parseFloat(reportData?.summary.totalIncome ?? "0");
  const totalExpense = parseFloat(reportData?.summary.totalExpense ?? "0");
  const balance = parseFloat(reportData?.summary.balance ?? "0");
  const totalCount = reportData?.summary.count ?? 0;

  const topCategory = reportData?.byCategory[0] ?? null;
  const averageExpense =
    reportData && reportData.byCategory.length > 0
      ? totalExpense / reportData.byCategory.length
      : 0;

  const bestMonth =
    reportData?.byMonth.reduce((best, item) =>
      parseFloat(item.balance) > parseFloat(best.balance) ? item : best
    ) ?? null;

  const worstMonth =
    reportData?.byMonth.reduce((worst, item) =>
      parseFloat(item.balance) < parseFloat(worst.balance) ? item : worst
    ) ?? null;

  const positiveMonths =
    reportData?.byMonth.filter((item) => parseFloat(item.balance) >= 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatorios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analise de receitas, despesas, saldo e distribuicao por categoria
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/financeiro/transacoes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Receipt className="h-4 w-4" />
            Transacoes
          </Link>
          <Link
            href="/financeiro/orcamento"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <BarChart3 className="h-4 w-4" />
            Orcamento
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={periodMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodMode("month")}
                >
                  Mensal
                </Button>
                <Button
                  variant={periodMode === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriodMode("year")}
                >
                  Anual
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Periodo selecionado</p>
                <p className="text-lg font-semibold capitalize">{periodLabel}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleShiftPeriod(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-40 text-center text-sm font-medium capitalize">
                  {periodLabel}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleShiftPeriod(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={handleResetPeriod}>
                <RefreshCw className="h-4 w-4" />
                Atual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <>
          <StatsSkeleton />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ListSkeleton count={4} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evolucao mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ListSkeleton count={4} />
              </CardContent>
            </Card>
          </div>
        </>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="space-y-1">
              <p className="font-semibold">Nao foi possivel carregar os relatorios</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => fetchReports(periodMode, month, year)}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Receitas"
              value={formatCurrency(totalIncome)}
              helper={periodMode === "month" ? "No mes selecionado" : "No ano selecionado"}
              icon={TrendingUp}
              valueClassName="text-green-600"
              iconClassName="bg-green-100 text-green-600"
            />
            <MetricCard
              title="Despesas"
              value={formatCurrency(totalExpense)}
              helper={periodMode === "month" ? "No mes selecionado" : "No ano selecionado"}
              icon={TrendingDown}
              valueClassName="text-red-600"
              iconClassName="bg-red-100 text-red-600"
            />
            <MetricCard
              title="Saldo"
              value={formatCurrency(balance)}
              helper={balance >= 0 ? "Resultado positivo" : "Resultado negativo"}
              icon={Wallet}
              valueClassName={balance >= 0 ? "text-green-700" : "text-red-700"}
              iconClassName={
                balance >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }
            />
            <MetricCard
              title="Lancamentos"
              value={String(totalCount)}
              helper="Receitas e despesas consideradas"
              icon={Receipt}
              iconClassName="bg-blue-100 text-blue-700"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Despesas por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseChart data={reportData?.byCategory ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {periodMode === "month"
                    ? "Evolucao dos ultimos 12 meses"
                    : `Fechamento mensal de ${year}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <IncomeVsExpense data={reportData?.byMonth ?? []} monthsToShow={12} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {periodMode === "month"
                    ? "Resumo por categoria no mes"
                    : "Resumo por categoria no ano"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlySummary
                  data={reportData?.byCategory ?? []}
                  totalExpense={totalExpense}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Insights rapidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Categoria com maior peso
                  </p>
                  {topCategory ? (
                    <div className="mt-2 space-y-2">
                      <CategoryBadge
                        category={{
                          name: topCategory.name,
                          color: topCategory.color,
                          icon: null,
                        }}
                      />
                      <p className="text-sm font-semibold text-red-600">
                        {formatCurrency(topCategory.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {topCategory.count} lancamento{topCategory.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhuma categoria com despesa no periodo.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Melhor saldo mensal
                    </p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {bestMonth ? formatMonthYear(bestMonth.month, bestMonth.year) : "Sem dados"}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {bestMonth ? formatCurrency(bestMonth.balance) : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Pior saldo mensal
                    </p>
                    <p className="mt-2 text-sm font-semibold capitalize">
                      {worstMonth ? formatMonthYear(worstMonth.month, worstMonth.year) : "Sem dados"}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {worstMonth ? formatCurrency(worstMonth.balance) : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Gasto medio por categoria
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatCurrency(averageExpense)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Entre categorias com despesa
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Meses com saldo positivo
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {positiveMonths} de {reportData?.byMonth.length ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Considerando a serie exibida
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {periodMode === "month"
                  ? `Fechamento ate ${formatMonthYear(month, year)}`
                  : `Linha mensal de ${year}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData?.byMonth.length ? (
                <div className="space-y-2">
                  {reportData.byMonth.map((item) => {
                    const itemBalance = parseFloat(item.balance);

                    return (
                      <div
                        key={`${item.year}-${item.month}`}
                        className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {formatMonthYear(item.month, item.year)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Receitas {formatCurrency(item.income)} | Despesas {formatCurrency(item.expense)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            itemBalance >= 0 ? "text-green-600" : "text-red-600"
                          )}
                        >
                          {formatCurrency(item.balance)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum dado mensal disponivel.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
