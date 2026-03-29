"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import { StatsCard } from "@/components/shared/stats-card";
import { StatsSkeleton, ListSkeleton } from "@/components/shared/loading-skeleton";
import {
  CalendarDays,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import {
  EVENT_PRIORITY_COLORS,
  TRANSACTION_TYPE_COLORS,
} from "@/lib/constants";

interface DashboardData {
  agenda: {
    todayCount: number;
    todayEvents: {
      id: string;
      title: string;
      date: string;
      startTime: string | null;
      endTime: string | null;
      priority: string;
      status: string;
      category: { name: string; color: string } | null;
    }[];
    upcomingEvents: {
      id: string;
      title: string;
      date: string;
      startTime: string | null;
      priority: string;
      status: string;
      category: { name: string; color: string } | null;
    }[];
    overdueCount: number;
  };
  financeiro: {
    totalIncome: string;
    totalExpense: string;
    balance: string;
    pendingCount: number;
    recentTransactions: {
      id: string;
      description: string;
      amount: string;
      type: string;
      date: string;
      paid: boolean;
      category: { id: string; name: string; color: string; type: string } | null;
    }[];
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const balance = data ? parseFloat(data.financeiro.balance) : 0;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold">Erro ao carregar o dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nao foi possivel conectar ao servidor.
          </p>
        </div>
        <button
          onClick={() => { setError(false); setLoading(true); fetch("/api/dashboard").then(r => r.ok ? r.json() : Promise.reject()).then(setData).catch(() => setError(true)).finally(() => setLoading(false)); }}
          className="text-sm underline text-primary"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{greeting}!</h2>
          <p className="text-muted-foreground text-sm">
            {formatDate(new Date())}
            {data?.agenda.overdueCount ? (
              <span className="text-destructive ml-2 font-medium">
                · {data.agenda.overdueCount} evento(s) vencido(s)
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Eventos hoje"
            value={data?.agenda.todayCount ?? 0}
            icon={CalendarDays}
            subtitle={data?.agenda.todayCount === 0 ? "Dia livre!" : "eventos pendentes"}
          />
          <StatsCard
            title="Saldo do mes"
            value={formatCurrency(balance)}
            icon={DollarSign}
            iconClassName={balance >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
            subtitle={balance >= 0 ? "Positivo" : "Negativo"}
          />
          <StatsCard
            title="Receitas"
            value={formatCurrency(parseFloat(data?.financeiro.totalIncome ?? "0"))}
            icon={TrendingUp}
            iconClassName="bg-green-500/10"
            subtitle="Este mes"
          />
          <StatsCard
            title="Despesas"
            value={formatCurrency(parseFloat(data?.financeiro.totalExpense ?? "0"))}
            icon={TrendingDown}
            iconClassName="bg-red-500/10"
            subtitle="Este mes"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Eventos */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {(data?.agenda.todayEvents?.length ?? 0) > 0 ? "Hoje" : "Proximos eventos"}
            </h3>
            <Link
              href="/agenda"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <ListSkeleton count={3} />
          ) : (
            <div className="space-y-2">
              {(data?.agenda.todayEvents?.length ?? 0) === 0 &&
              (data?.agenda.upcomingEvents?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum evento proximo.
                </p>
              ) : (
                [
                  ...(data?.agenda.todayEvents ?? []),
                  ...(data?.agenda.upcomingEvents ?? []),
                ]
                  .slice(0, 5)
                  .map((event) => (
                    <Link
                      key={event.id}
                      href={`/agenda/${event.id}`}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div
                        className="w-1 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: event.category?.color ?? "#6b7280" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                          {event.startTime && ` · ${event.startTime}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                          EVENT_PRIORITY_COLORS[event.priority]
                        )}
                      >
                        {event.priority === "URGENT" ? "Urgente" : ""}
                      </span>
                    </Link>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Transações */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Ultimas transacoes</h3>
            <Link
              href="/financeiro/transacoes"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Ver todos
            </Link>
          </div>

          {loading ? (
            <ListSkeleton count={3} />
          ) : (
            <div className="space-y-2">
              {(data?.financeiro.recentTransactions?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma transacao este mes.
                </p>
              ) : (
                data?.financeiro.recentTransactions.map((t) => (
                  <Link
                    key={t.id}
                    href={`/financeiro/transacoes/${t.id}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: (t.category?.color ?? "#6b7280") + "20" }}
                    >
                      {t.paid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.category?.name ?? "Sem categoria"} · {formatDate(t.date)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold shrink-0",
                        TRANSACTION_TYPE_COLORS[t.type]
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(parseFloat(t.amount))}
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {data?.financeiro.pendingCount ? (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>{data.financeiro.pendingCount} conta(s)</strong> com vencimento nos proximos 7 dias.{" "}
            <Link href="/financeiro/transacoes?paid=false" className="underline font-medium">
              Ver pendentes
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
