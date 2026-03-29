"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { cn } from "@/lib/utils";
import type { FinanceCategory } from "@/types/financeiro";

const PRESET_COLORS = [
  "#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444",
  "#F97316", "#EC4899", "#6366F1", "#14B8A6", "#06B6D4",
  "#A855F7", "#6B7280",
];

interface CategoryFormData {
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon: string;
  budgetAmount: string;
}

const defaultFormData: CategoryFormData = {
  name: "",
  type: "EXPENSE",
  color: "#6B7280",
  icon: "",
  budgetAmount: "",
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financeiro/categorias");
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch {
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEdit(cat: FinanceCategory) {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon ?? "",
      budgetAmount: cat.budgetAmount ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      toast.error("Cor invalida — use formato hex #RRGGBB");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        type: formData.type,
        color: formData.color,
        icon: formData.icon || undefined,
        budgetAmount: formData.budgetAmount ? parseFloat(formData.budgetAmount) : undefined,
      };

      const url = editingId
        ? `/api/financeiro/categorias/${editingId}`
        : "/api/financeiro/categorias";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar categoria");
        return;
      }

      toast.success(editingId ? "Categoria atualizada!" : "Categoria criada!");
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error("Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/financeiro/categorias/${deleteId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao excluir categoria");
        return;
      }
      toast.success("Categoria excluida");
      setDeleteId(null);
      fetchCategories();
    } catch {
      toast.error("Erro ao excluir categoria");
    } finally {
      setDeleting(false);
    }
  }

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  function renderSection(
    title: string,
    items: FinanceCategory[],
    accentClass: string
  ) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className={cn("text-sm font-semibold", accentClass)}>{title}</h2>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((cat) => (
              <div
                key={cat.id}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
              >
                <span
                  className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  {cat.budgetAmount && (
                    <p className="text-xs text-muted-foreground">
                      Limite: R$ {parseFloat(cat.budgetAmount).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Editar"
                    onClick={() => openEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Excluir"
                    onClick={() => setDeleteId(cat.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize suas receitas e despesas
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {/* Category lists */}
      {loading ? (
        <ListSkeleton count={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria"
          description="Crie categorias para organizar suas transacoes."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Criar primeira categoria
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {renderSection("Receitas", incomeCategories, "text-green-600")}
          {renderSection("Despesas", expenseCategories, "text-red-600")}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(["INCOME", "EXPENSE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, type: t }))}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                      formData.type === t
                        ? t === "INCOME"
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-red-50 border-red-500 text-red-700"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t === "INCOME" ? "Receita" : "Despesa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nome *</Label>
              <Input
                id="cat-name"
                placeholder="Ex: Alimentacao, Salario..."
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Cor */}
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => setFormData((p) => ({ ...p, color: c }))}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      formData.color === c ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                  className="h-8 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                  placeholder="#RRGGBB"
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>

            {/* Limite de orcamento (apenas despesas) */}
            {formData.type === "EXPENSE" && (
              <div className="space-y-1.5">
                <Label htmlFor="cat-budget">Limite mensal (R$)</Label>
                <Input
                  id="cat-budget"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional — limite desta categoria"
                  value={formData.budgetAmount}
                  onChange={(e) => setFormData((p) => ({ ...p, budgetAmount: e.target.value }))}
                />
              </div>
            )}

            {/* Acoes */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir categoria"
        description="Tem certeza? Categorias com transacoes vinculadas nao podem ser excluidas."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
