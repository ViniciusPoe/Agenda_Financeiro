"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
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
import type { AgendaCategory } from "@/types/agenda";

const PRESET_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#F97316",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
  "#06B6D4",
  "#A855F7",
  "#6B7280",
];

interface CategoryFormData {
  name: string;
  color: string;
}

const defaultFormData: CategoryFormData = {
  name: "",
  color: "#6B7280",
};

export default function AgendaCategoriasPage() {
  const [categories, setCategories] = useState<AgendaCategory[]>([]);
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
      const res = await fetch("/api/agenda/categorias");
      const json = await res.json();
      if (json.data) setCategories(json.data);
    } catch {
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingId(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEdit(category: AgendaCategory) {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      color: category.color,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      toast.error("Cor invalida. Use o formato #RRGGBB");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        color: formData.color,
      };

      const url = editingId
        ? `/api/agenda/categorias/${editingId}`
        : "/api/agenda/categorias";
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
      void fetchCategories();
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
      const res = await fetch(`/api/agenda/categorias/${deleteId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erro ao excluir categoria");
        return;
      }

      const eventCount = Number(json.data?.eventCount ?? 0);
      if (eventCount > 0) {
        toast.success(
          `Categoria excluida. ${eventCount} evento${eventCount !== 1 ? "s" : ""} ficou${eventCount !== 1 ? "ram" : ""} sem categoria.`
        );
      } else {
        toast.success("Categoria excluida");
      }

      setDeleteId(null);
      void fetchCategories();
    } catch {
      toast.error("Erro ao excluir categoria");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Categorias da Agenda
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organize seus eventos e compromissos por categoria
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description="Crie categorias para organizar melhor seus eventos."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              Criar primeira categoria
            </Button>
          }
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const isSeeded = category.id.startsWith("seed-agenda-");

            return (
              <div
                key={category.id}
                className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {category.name}
                    </p>
                    {isSeeded && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Padrao
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cor {category.color}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Editar"
                    onClick={() => openEdit(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Excluir"
                    onClick={() => setDeleteId(category.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar categoria" : "Nova categoria"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-category-name">Nome *</Label>
              <Input
                id="agenda-category-name"
                placeholder="Ex: Trabalho, Pessoal, Saude..."
                value={formData.name}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        color,
                      }))
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      formData.color === color
                        ? "scale-110 border-foreground"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      color: e.target.value,
                    }))
                  }
                  className="h-8 w-14 cursor-pointer p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      color: e.target.value,
                    }))
                  }
                  placeholder="#RRGGBB"
                  className="h-8 flex-1 text-xs"
                />
              </div>
            </div>

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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir categoria"
        description="Os eventos vinculados continuarao existindo e ficarao sem categoria."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
