"use client";

import { type ElementType, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  RefreshCw,
  Tags,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryDistributionChart } from "@/components/agenda/category-distribution-chart";
import { MonthlyEventsChart } from "@/components/agenda/monthly-events-chart";
import { ListSkeleton, StatsSkeleton } from "@/components/shared/loading-skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn, getMonthName } from "@/lib/utils";
import {
  EVENT_PRIORITY_LABELS,
  EVENT_STATUS_LABELS,
} from "@/lib/constants";

type PeriodMode = "month" | "year";

interface ReportData {
  summary: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    overdue: number;
    allDay: number;
    completionRate: number;
  };
  byCategory: Array<{
    categoryId: string | null;
    name: string;
    color: string;
    count: number;
    completedCount: number;
    overdueCount: number;
  }>;
  byStatus: Array<{
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    count: number;
  }>;
  byPriority: Array<{
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    count: number;
  }>;
  byWeekday: Array<{
    weekday: number;
    label: string;
    count: number;
  }>;
  byMonth: Array<{
    month: number;
    year: number;
    total: number;
    completed: number;
    cancelled: number;
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

export default function AgendaRelatoriosPage() {
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

        const res = await fetch(`/api/agenda/relatorios?${params.toString()}`);
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
    void fetchReports(periodMode, month, year);
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

  const topCategory = reportData?.byCategory[0] ?? null;
  const busiestWeekday =
    reportData && reportData.summary.total > 0
      ? reportData.byWeekday.reduce((best, item) =>
          item.count > best.count ? item : best
        )
      : null;
  const topPriority =
    reportData && reportData.summary.total > 0
      ? reportData.byPriority.reduce((best, item) =>
          item.count > best.count ? item : best
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Relatorios da Agenda
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visao por periodo, categorias, prioridades e conclusao dos eventos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/agenda"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <CalendarDays className="h-4 w-4" />
            Agenda
          </Link>
          <Link
            href="/agenda/categorias"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Tags className="h-4 w-4" />
            Categorias
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
                <CardTitle>Eventos por categoria</CardTitle>
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
              title="Eventos"
              value={String(reportData?.summary.total ?? 0)}
              helper={periodMode === "month" ? "No mes selecionado" : "No ano selecionado"}
              icon={BarChart3}
              iconClassName="bg-blue-100 text-blue-700"
            />
            <MetricCard
              title="Taxa de conclusao"
              value={`${reportData?.summary.completionRate ?? 0}%`}
              helper={`${reportData?.summary.completed ?? 0} concluido(s)`}
              icon={CircleCheck}
              valueClassName="text-green-600"
              iconClassName="bg-green-100 text-green-600"
            />
            <MetricCard
              title="Vencidos"
              value={String(reportData?.summary.overdue ?? 0)}
              helper="Pendentes fora da data"
              icon={TriangleAlert}
              valueClassName="text-red-600"
              iconClassName="bg-red-100 text-red-600"
            />
            <MetricCard
              title="Dia inteiro"
              value={String(reportData?.summary.allDay ?? 0)}
              helper="Eventos sem horario definido"
              icon={Clock3}
              iconClassName="bg-amber-100 text-amber-700"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Eventos por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDistributionChart data={reportData?.byCategory ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {periodMode === "month"
                    ? "Evolucao dos ultimos 12 meses"
                    : `Linha mensal de ${year}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyEventsChart data={reportData?.byMonth ?? []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {periodMode === "month"
                    ? "Resumo por categoria no mes"
                    : "Resumo por categoria no ano"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData?.byCategory.length ? (
                  <div className="space-y-2">
                    {reportData.byCategory.map((item) => {
                      const percentage =
                        (reportData.summary.total ?? 0) > 0
                          ? (item.count / reportData.summary.total) * 100
                          : 0;

                      return (
                        <div key={item.categoryId ?? "none"} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="truncate font-medium">{item.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                ({item.count})
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.completedCount} concl.
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum evento no periodo.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Insights rapidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Categoria mais usada
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {topCategory ? topCategory.name : "Sem dados"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {topCategory ? `${topCategory.count} evento(s)` : "Nenhum evento no periodo"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Dia mais carregado
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {busiestWeekday ? busiestWeekday.label : "Sem dados"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {busiestWeekday ? `${busiestWeekday.count} evento(s)` : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Prioridade dominante
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {topPriority ? EVENT_PRIORITY_LABELS[topPriority.priority] : "Sem dados"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {topPriority ? `${topPriority.count} evento(s)` : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Em andamento
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {reportData?.summary.inProgress ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Eventos marcados manualmente
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cancelados
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {reportData?.summary.cancelled ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      No periodo exibido
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribuicao por status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportData?.byStatus.map((item) => {
                  const percentage =
                    (reportData.summary.total ?? 0) > 0
                      ? (item.count / reportData.summary.total) * 100
                      : 0;

                  return (
                    <div key={item.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {EVENT_STATUS_LABELS[item.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

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
                    {reportData.byMonth.map((item) => (
                      <div
                        key={`${item.year}-${item.month}`}
                        className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {formatMonthYear(item.month, item.year)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.total} evento(s) | {item.completed} concluido(s) | {item.cancelled} cancelado(s)
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">
                          {item.total} total
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum dado mensal disponivel.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
