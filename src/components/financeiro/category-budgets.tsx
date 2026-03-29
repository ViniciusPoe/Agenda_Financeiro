"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BudgetProgress } from "@/components/financeiro/budget-progress";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { cn, formatCurrency } from "@/lib/utils";

interface CategoryBudgetItem {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string | null;
  budgetAmount: string | null;
  spent: string;
  percentage: number | null;
}

interface CategoryBudgetsProps {
  month: number;
  year: number;
}

// -------------------------------------------------------------------
// Inline budget editor — shared by both "with limit" and "without limit" rows
// -------------------------------------------------------------------
interface InlineEditorProps {
  categoryId: string;
  currentValue: string; // empty string when no limit set
  onSaved: () => void;
  onCancel: () => void;
}

function InlineEditor({
  categoryId,
  currentValue,
  onSaved,
  onCancel,
}: InlineEditorProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  async function handleSave() {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      toast.error("Informe um valor valido e positivo");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/financeiro/categorias/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetAmount: num }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar limite");
        return;
      }
      toast.success("Limite salvo!");
      onSaved();
    } catch {
      toast.error("Erro ao salvar limite");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
          R$
        </span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-7 w-28 rounded-md border bg-background pl-7 pr-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
          placeholder="0,00"
          disabled={saving}
        />
      </div>

      {/* Confirm */}
      <button
        onClick={handleSave}
        disabled={saving}
        title="Salvar limite"
        className={cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md",
          "border border-green-500 text-green-600 bg-green-50",
          "hover:bg-green-100 disabled:opacity-50 transition-colors shrink-0"
        )}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Cancel */}
      <button
        onClick={onCancel}
        disabled={saving}
        title="Cancelar"
        className={cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md",
          "border border-border text-muted-foreground",
          "hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// -------------------------------------------------------------------
// Row for categories WITHOUT a budget limit
// -------------------------------------------------------------------
interface NoBudgetRowProps {
  cat: CategoryBudgetItem;
  onSaved: () => void;
}

function NoBudgetRow({ cat, onSaved }: NoBudgetRowProps) {
  const [editing, setEditing] = useState(false);
  const spentNum = parseFloat(cat.spent);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {/* Color dot */}
      <span
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: cat.color }}
      />

      {/* Name + spent */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cat.categoryName}</p>
        {spentNum > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(spentNum)} gasto este mes
          </p>
        )}
      </div>

      {/* Inline editor or "Definir limite" button */}
      {editing ? (
        <InlineEditor
          categoryId={cat.categoryId}
          currentValue=""
          onSaved={() => {
            setEditing(false);
            onSaved();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "inline-flex items-center gap-1 h-7 rounded-md px-2",
            "text-xs border border-dashed border-muted-foreground/40 text-muted-foreground",
            "hover:border-primary hover:text-primary transition-colors shrink-0"
          )}
          title={`Definir limite para ${cat.categoryName}`}
        >
          <Pencil className="h-3 w-3" />
          Definir limite
        </button>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Row for categories WITH a budget limit (wraps BudgetProgress + edit)
// -------------------------------------------------------------------
interface WithBudgetRowProps {
  cat: CategoryBudgetItem;
  onSaved: () => void;
}

function WithBudgetRow({ cat, onSaved }: WithBudgetRowProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const limitNum = cat.budgetAmount ? parseFloat(cat.budgetAmount) : 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/financeiro/categorias/${cat.categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetAmount: null }),
      });
      if (!res.ok) {
        toast.error("Erro ao remover limite");
        return;
      }
      toast.success("Limite removido");
      onSaved();
    } catch {
      toast.error("Erro ao remover limite");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {editing ? (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          <p className="text-sm font-medium flex-1 truncate">{cat.categoryName}</p>
          <InlineEditor
            categoryId={cat.categoryId}
            currentValue={limitNum > 0 ? String(limitNum) : ""}
            onSaved={() => {
              setEditing(false);
              onSaved();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <BudgetProgress
              label={cat.categoryName}
              color={cat.color}
              spent={parseFloat(cat.spent)}
              limit={limitNum > 0 ? limitNum : null}
              percentage={cat.percentage}
            />
          </div>
          {/* Pencil edit button */}
          <button
            onClick={() => setEditing(true)}
            title={`Editar limite de ${cat.categoryName}`}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-md shrink-0",
              "border border-transparent text-muted-foreground",
              "hover:border-border hover:bg-muted transition-colors"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            title={`Remover limite de ${cat.categoryName}`}
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-md shrink-0",
              "border border-transparent text-muted-foreground",
              "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
            )}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------
export function CategoryBudgets({ month, year }: CategoryBudgetsProps) {
  const [items, setItems] = useState<CategoryBudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/financeiro/orcamento/categorias?month=${month}&year=${year}`
      );
      const json = await res.json();
      if (json.data) {
        setItems(json.data);
      }
    } catch {
      // Silently degrade — the section simply stays empty
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Separate categories with and without a budget limit
  const withBudget = items.filter(
    (c) => c.budgetAmount !== null && parseFloat(c.budgetAmount) > 0
  );
  const withoutBudget = items.filter(
    (c) => c.budgetAmount === null || parseFloat(c.budgetAmount ?? "0") === 0
  );

  // Sort by percentage desc (most critical first), then by spent desc
  const sortedWithBudget = [...withBudget].sort((a, b) => {
    const pctDiff = (b.percentage ?? 0) - (a.percentage ?? 0);
    if (pctDiff !== 0) return pctDiff;
    return parseFloat(b.spent) - parseFloat(a.spent);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Orcamento por categoria</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <ListSkeleton count={3} />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria de despesa cadastrada.
          </p>
        ) : (
          <>
            {/* Categories with a budget limit */}
            {sortedWithBudget.length > 0 && (
              <div className="space-y-3">
                {sortedWithBudget.map((cat) => (
                  <WithBudgetRow
                    key={cat.categoryId}
                    cat={cat}
                    onSaved={fetchItems}
                  />
                ))}
              </div>
            )}

            {/* Categories without a budget limit */}
            {withoutBudget.length > 0 && (
              <div>
                {sortedWithBudget.length > 0 && (
                  <div className="flex items-center gap-3 mb-3 mt-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Sem limite definido
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {withoutBudget.map((cat) => (
                    <NoBudgetRow
                      key={cat.categoryId}
                      cat={cat}
                      onSaved={fetchItems}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
