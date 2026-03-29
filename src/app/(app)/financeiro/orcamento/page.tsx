"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BudgetProgress } from "@/components/financeiro/budget-progress";
import { CategoryBudgets } from "@/components/financeiro/category-budgets";
import { StatsSkeleton, ListSkeleton } from "@/components/shared/loading-skeleton";
import { cn, formatCurrency, getMonthName } from "@/lib/utils";

interface CategoryBudgetItem {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string | null;
  budgetAmount: string | null;
  spent: string;
  percentage: number | null;
}

interface BudgetData {
  month: number;
  year: number;
  budget: {
    id: string;
    month: number;
    year: number;
    totalLimit: string;
    notes: string | null;
  } | null;
  totalLimit: string;
  totalSpent: string;
  remaining: string;
  percentage: number;
  categories: CategoryBudgetItem[];
}

export default function OrcamentoPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editLimit, setEditLimit] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  const fetchBudget = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financeiro/orcamento?month=${m}&year=${y}`);
      const json = await res.json();
      if (json.data) {
        const data: BudgetData = json.data;
        setBudgetData(data);
        setEditLimit(data.totalLimit !== "0.00" ? data.totalLimit : "");
        setEditNotes(data.budget?.notes ?? "");
        // Show form if no budget set yet
        setShowForm(!data.budget);
      }
    } catch {
      toast.error("Erro ao carregar orcamento");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudget(month, year);
  }, [month, year, fetchBudget]);

  function navigateMonth(direction: "prev" | "next") {
    let newMonth = direction === "prev" ? month - 1 : month + 1;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setMonth(newMonth);
    setYear(newYear);
  }

  async function handleDeleteBudget() {
    if (!budgetData?.budget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/financeiro/orcamento?month=${month}&year=${year}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Erro ao excluir orcamento");
        return;
      }
      toast.success("Orcamento excluido");
      setShowForm(false);
      fetchBudget(month, year);
    } catch {
      toast.error("Erro ao excluir orcamento");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveBudget() {
    const limit = parseFloat(editLimit);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Informe um limite valido e positivo");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/financeiro/orcamento", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          totalLimit: limit,
          notes: editNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar orcamento");
        return;
      }
      toast.success("Orcamento salvo!");
      setShowForm(false);
      fetchBudget(month, year);
    } catch {
      toast.error("Erro ao salvar orcamento");
    } finally {
      setSaving(false);
    }
  }

  const monthName = getMonthName(month);
  const totalSpent = budgetData ? parseFloat(budgetData.totalSpent) : 0;
  const totalLimit = budgetData ? parseFloat(budgetData.totalLimit) : 0;
  const remaining = budgetData ? parseFloat(budgetData.remaining) : 0;
  const pct = budgetData?.percentage ?? 0;

  // Warn categories
  // Warn when category reaches 70% (matches yellow threshold in BudgetProgress)
  const warningCategories =
    budgetData?.categories.filter((c) => c.percentage !== null && c.percentage >= 70) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orcamento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planejamento financeiro mensal
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold capitalize min-w-32 text-center">
            {monthName} de {year}
          </span>
          <Button variant="outline" size="icon-sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerts for over-budget categories */}
      {!loading && warningCategories.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 px-4 py-3 text-sm">
          <p className="font-semibold text-yellow-800 mb-1">Atencao: categorias proximas ou acima do limite</p>
          <ul className="text-yellow-700 space-y-0.5">
            {warningCategories.map((c) => (
              <li key={c.categoryId}>
                <span className="font-medium">{c.categoryName}</span>
                {" — "}
                {c.percentage}% utilizado
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall budget progress */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base capitalize">
                {monthName} de {year}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm((v) => !v)}
                >
                  {showForm ? "Cancelar" : "Editar limite"}
                </Button>
                {budgetData?.budget && !showForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteBudget}
                    disabled={deleting}
                    className="text-destructive hover:bg-destructive/10 hover:border-destructive/40"
                  >
                    {deleting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showForm && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-limit">Limite total (R$) *</Label>
                    <Input
                      id="edit-limit"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ex: 3000,00"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-notes">Notas</Label>
                  <Textarea
                    id="edit-notes"
                    placeholder="Observacoes sobre este orcamento..."
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleSaveBudget}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" />
                  Salvar orcamento
                </Button>
              </div>
            )}

            {/* Overall progress bar */}
            {totalLimit > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">Total gasto</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-muted-foreground font-medium">Limite</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalLimit)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-red-400" : pct >= 60 ? "bg-yellow-500" : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "font-semibold",
                        pct >= 100 ? "text-red-600" : pct >= 80 ? "text-red-500" : pct >= 60 ? "text-yellow-600" : "text-green-600"
                      )}
                    >
                      {pct}% utilizado
                    </span>
                    <span>
                      {remaining >= 0
                        ? `${formatCurrency(remaining)} restante`
                        : `${formatCurrency(Math.abs(remaining))} acima do limite`}
                    </span>
                  </div>
                </div>

                {budgetData?.budget?.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {budgetData.budget.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum limite definido para este mes.{" "}
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary underline"
                >
                  Definir agora
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Categories — spending summary (only categories with actual spending) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Despesas por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <ListSkeleton count={4} />
          ) : !budgetData || budgetData.categories.filter((c) => parseFloat(c.spent) > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma despesa registrada neste mes.
            </p>
          ) : (
            <div className="space-y-3">
              {budgetData.categories
                .filter((c) => parseFloat(c.spent) > 0 || (c.budgetAmount && parseFloat(c.budgetAmount) > 0))
                .sort((a, b) => parseFloat(b.spent) - parseFloat(a.spent))
                .map((cat) => (
                  <BudgetProgress
                    key={cat.categoryId}
                    label={cat.categoryName}
                    color={cat.color}
                    spent={parseFloat(cat.spent)}
                    limit={cat.budgetAmount ? parseFloat(cat.budgetAmount) : null}
                    percentage={cat.percentage}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-category budget limits — all expense categories with progress bars and "Definir limite" for those without */}
      <CategoryBudgets month={month} year={year} />
    </div>
  );
}
