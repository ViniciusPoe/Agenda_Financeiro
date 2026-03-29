"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FinanceFiltersBar,
  type FinanceFiltersState,
  getInitialFinanceFilters,
} from "@/components/financeiro/filters-bar";
import { TransactionList } from "@/components/financeiro/transaction-list";
import { RecurringSection } from "@/components/financeiro/recurring-section";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types/financeiro";

function buildApiUrl(filters: FinanceFiltersState, page: number): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.type) params.set("type", filters.type);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.paid) params.set("paid", filters.paid);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(page));
  params.set("limit", "20");
  return `/api/financeiro/transacoes?${params.toString()}`;
}

export default function TransacoesPage() {
  const [filters, setFilters] = useState<FinanceFiltersState>(getInitialFinanceFilters);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Running totals for the current filtered set
  const [periodSummary, setPeriodSummary] = useState<{
    income: number;
    expense: number;
  } | null>(null);

  const fetchTransactions = useCallback(
    async (activeFilters: FinanceFiltersState, activePage: number) => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(activeFilters, activePage));
        const json = await res.json();
        if (json.data) {
          setTransactions(json.data);
          setTotal(json.total ?? 0);
          setTotalPages(json.totalPages ?? 1);
        }
      } catch {
        // keep existing
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch summary for the period (all pages)
  const fetchSummary = useCallback(async (activeFilters: FinanceFiltersState) => {
    if (!activeFilters.dateFrom && !activeFilters.dateTo) {
      setPeriodSummary(null);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (activeFilters.dateFrom) params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set("dateTo", activeFilters.dateTo);
      if (activeFilters.type) params.set("type", activeFilters.type);
      if (activeFilters.categoryId) params.set("categoryId", activeFilters.categoryId);
      params.set("limit", "1000");
      params.set("page", "1");
      const res = await fetch(`/api/financeiro/transacoes?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        const all: Transaction[] = json.data;
        const income = all
          .filter((t) => t.type === "INCOME")
          .reduce((s, t) => s + parseFloat(t.amount), 0);
        const expense = all
          .filter((t) => t.type === "EXPENSE")
          .reduce((s, t) => s + parseFloat(t.amount), 0);
        setPeriodSummary({ income, expense });
      }
    } catch {
      setPeriodSummary(null);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(filters, page);
  }, [fetchTransactions, filters, page]);

  useEffect(() => {
    fetchSummary(filters);
  }, [fetchSummary, filters]);

  function handleFiltersChange(newFilters: FinanceFiltersState) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleDeleted(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => prev - 1);
  }

  function handleUpdated(updated: Transaction) {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  // Extrai mês/ano do filtro ativo para a seção de recorrentes.
  // Prioriza dateFrom quando preenchido; caso contrário usa o mês atual.
  const { recurringMonth, recurringYear } = useMemo(() => {
    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom + "T12:00:00");
      return { recurringMonth: d.getMonth() + 1, recurringYear: d.getFullYear() };
    }
    const now = new Date();
    return { recurringMonth: now.getMonth() + 1, recurringYear: now.getFullYear() };
  }, [filters.dateFrom]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transacoes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} transacao{total !== 1 ? "es" : ""} encontrada{total !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/financeiro/transacoes/nova"
          className={cn(buttonVariants({ variant: "default", size: "sm" }))}
        >
          <Plus className="h-4 w-4" />
          Nova transacao
        </Link>
      </div>

      {/* Period summary bar */}
      {periodSummary && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 border px-4 py-2.5 text-sm">
          <span className="text-muted-foreground font-medium">Periodo:</span>
          <span className="flex items-center gap-1 text-green-600 font-semibold">
            Receitas: {formatCurrency(periodSummary.income)}
          </span>
          <span className="flex items-center gap-1 text-red-600 font-semibold">
            Despesas: {formatCurrency(periodSummary.expense)}
          </span>
          <span className={cn(
            "flex items-center gap-1 font-semibold",
            periodSummary.income - periodSummary.expense >= 0 ? "text-green-700" : "text-red-700"
          )}>
            Saldo: {formatCurrency(periodSummary.income - periodSummary.expense)}
          </span>
        </div>
      )}

      {/* Filters */}
      <FinanceFiltersBar filters={filters} onChange={handleFiltersChange} />

      {/* Recorrentes do mes */}
      <RecurringSection
        month={recurringMonth}
        year={recurringYear}
        onGenerated={() => fetchTransactions(filters, page)}
      />

      {/* List */}
      {loading ? (
        <ListSkeleton count={5} />
      ) : (
        <TransactionList
          transactions={transactions}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Proxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
