"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Ban,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  EVENT_PRIORITY_LABELS,
  EVENT_PRIORITY_COLORS,
  REMINDER_OPTIONS,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
} from "@/lib/constants";
import {
  cn,
  formatDate,
  isOverdue,
  formatCurrency,
  decimalToNumber,
  toDateOnlyString,
} from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

// Priority border color map for the card left border
const PRIORITY_BORDER: Record<string, string> = {
  LOW: "border-l-slate-400",
  MEDIUM: "border-l-blue-400",
  HIGH: "border-l-orange-400",
  URGENT: "border-l-red-500",
};

function formatReminderLabel(reminderMinutes: number): string {
  return (
    REMINDER_OPTIONS.find((option) => option.value === reminderMinutes)?.label ??
    `${reminderMinutes} min antes`
  );
}

interface EventCardProps {
  event: AgendaEvent;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (event: AgendaEvent) => void;
  compact?: boolean;
}

export function EventCard({
  event,
  onDeleted,
  onStatusChanged,
  compact = false,
}: EventCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Freelance income dialog — shown when marking a freelancer event as completed
  const [freelanceDialogOpen, setFreelanceDialogOpen] = useState(false);
  const [addingIncome, setAddingIncome] = useState(false);

  const overdue = isOverdue(event.date, event.status);
  const isCompleted = event.status === "COMPLETED";
  const isCancelled = event.status === "CANCELLED";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erro ao excluir evento");
        return;
      }
      toast.success("Evento excluido");
      setDeleteOpen(false);
      onDeleted?.(event.id);
      router.refresh();
    } catch {
      toast.error("Erro ao excluir evento");
    } finally {
      setDeleting(false);
    }
  }

  async function markEventComplete(
    newStatus: "PENDING" | "COMPLETED"
  ): Promise<boolean> {
    setCompleting(true);
    try {
      const res = await fetch(`/api/agenda/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao atualizar status");
        return false;
      }
      toast.success(
        newStatus === "COMPLETED" ? "Evento concluido!" : "Evento reaberto"
      );
      onStatusChanged?.(json.data);
      router.refresh();
      return true;
    } catch {
      toast.error("Erro ao atualizar status");
      return false;
    } finally {
      setCompleting(false);
    }
  }

  async function handleToggleComplete() {
    if (isCancelled) return;
    const newStatus = isCompleted ? "PENDING" : "COMPLETED";

    // If marking as completed and event is freelancer with an amount, show income dialog
    if (newStatus === "COMPLETED" && event.isFreelancer && event.freelanceAmount) {
      const updated = await markEventComplete("COMPLETED");
      if (updated) {
        setFreelanceDialogOpen(true);
      }
      return;
    }

    await markEventComplete(newStatus);
  }

  async function handleAddFreelanceIncome() {
    if (!event.freelanceAmount) return;
    setAddingIncome(true);
    try {
      // Fetch the first available INCOME category to assign the transaction
      const catRes = await fetch("/api/financeiro/categorias?type=INCOME");
      const catJson = await catRes.json();
      const categories: Array<{ id: string; name: string }> = catJson.data ?? [];

      // Prefer a category named "Freelance" or "Receita", otherwise take the first
      const preferred = categories.find(
        (c) =>
          c.name.toLowerCase().includes("freelance") ||
          c.name.toLowerCase().includes("receita")
      );
      const category = preferred ?? categories[0];

      if (!category) {
        toast.error("Nenhuma categoria de receita encontrada. Crie uma no financeiro.");
        return;
      }

      const amount = decimalToNumber(event.freelanceAmount);
      const eventDate = toDateOnlyString(event.date);

      const res = await fetch("/api/financeiro/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INCOME",
          amount,
          description: `Freelance: ${event.title}`,
          date: eventDate,
          paid: true,
          categoryId: category.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao criar receita");
        return;
      }

      toast.success("Receita adicionada ao financeiro!");
    } catch {
      toast.error("Erro ao adicionar receita");
    } finally {
      setAddingIncome(false);
      setFreelanceDialogOpen(false);
    }
  }

  async function handleToggleCancelled() {
    setCancelling(true);
    try {
      const newStatus = isCancelled ? "PENDING" : "CANCELLED";
      const res = await fetch(`/api/agenda/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao atualizar status");
        return;
      }
      toast.success(
        newStatus === "CANCELLED" ? "Evento cancelado!" : "Evento reaberto"
      );
      onStatusChanged?.(json.data);
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setCancelling(false);
    }
  }

  if (compact) {
    return (
      <Link href={`/agenda/${event.id}`}>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs truncate cursor-pointer hover:opacity-80 transition-opacity",
            isCompleted && "opacity-60 line-through",
            overdue && "opacity-80"
          )}
          style={{
            backgroundColor: event.category?.color
              ? event.category.color + "30"
              : "#6366f130",
            borderLeft: `3px solid ${event.category?.color ?? "#6366f1"}`,
          }}
        >
          {overdue && !isCompleted && (
            <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
          )}
          <span className="truncate font-medium">{event.title}</span>
          {event.startTime && (
            <span className="text-muted-foreground shrink-0">
              {event.startTime}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg border border-l-4 bg-card p-4 transition-shadow hover:shadow-md",
          PRIORITY_BORDER[event.priority],
          overdue && "bg-destructive/5 border-destructive/30 border-l-destructive",
          isCompleted && "opacity-70",
          isCancelled && "opacity-60"
        )}
      >
        {/* Cabecalho */}
        <div className="flex items-start gap-3">
          {/* Botao de completar */}
          <button
            onClick={handleToggleComplete}
            disabled={completing || isCancelled}
            className={cn(
              "mt-0.5 h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
              isCompleted
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground hover:border-primary",
              isCancelled && "opacity-40 cursor-not-allowed"
            )}
            title={isCompleted ? "Reabrir evento" : "Marcar como concluido"}
          >
            {isCompleted && <CheckCircle2 className="h-4 w-4" />}
          </button>

          {/* Conteudo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  "font-medium text-sm leading-tight",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {event.title}
              </h3>
              {/* Acoes rapidas - visivel no hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title={isCancelled ? "Reabrir" : "Cancelar"}
                  onClick={handleToggleCancelled}
                  disabled={cancelling}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    isCancelled && "text-amber-600 hover:text-amber-700"
                  )}
                >
                  <Ban className="h-3.5 w-3.5" />
                </Button>
                <Link href={`/agenda/${event.id}`}>
                  <Button variant="ghost" size="icon-sm" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Excluir"
                  onClick={() => setDeleteOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {event.description && !compact && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {event.description}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Data e hora */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDate(event.date)}</span>
                {!event.allDay && event.startTime && (
                  <span>
                    {event.startTime}
                    {event.endTime && ` - ${event.endTime}`}
                  </span>
                )}
                {event.allDay && <span>(Dia inteiro)</span>}
              </div>

              {/* Badge de status */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  overdue && !isCompleted && !isCancelled
                    ? "bg-destructive/10 text-destructive"
                    : EVENT_STATUS_COLORS[event.status]
                )}
              >
                {overdue && !isCompleted && !isCancelled
                  ? "Vencido"
                  : EVENT_STATUS_LABELS[event.status]}
              </span>

              {/* Badge de prioridade */}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  EVENT_PRIORITY_COLORS[event.priority]
                )}
              >
                {EVENT_PRIORITY_LABELS[event.priority]}
              </span>

              {/* Categoria */}
              {event.category && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: event.category.color }}
                  />
                  {event.category.name}
                </span>
              )}

              {/* Lembrete */}
              {event.reminderMinutes != null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bell className="h-3 w-3" />
                  {formatReminderLabel(event.reminderMinutes)}
                </span>
              )}

              {/* Badge freelancer */}
              {event.isFreelancer && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 rounded-full px-2 py-0.5">
                  <Briefcase className="h-3 w-3" />
                  {event.freelanceAmount
                    ? formatCurrency(decimalToNumber(event.freelanceAmount))
                    : "Freelancer"}
                </span>
              )}

              {/* Indicador de vencido */}
              {overdue && !isCompleted && !isCancelled && (
                <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                  <AlertCircle className="h-3 w-3" />
                  Vencido
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir evento"
        description={`Tem certeza que deseja excluir "${event.title}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />

      {/* Dialog para adicionar receita de freelance ao concluir */}
      <AlertDialog open={freelanceDialogOpen} onOpenChange={setFreelanceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar receita freelancer?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja adicionar{" "}
              <span className="font-medium text-foreground">
                {event.freelanceAmount
                  ? formatCurrency(decimalToNumber(event.freelanceAmount))
                  : ""}
              </span>{" "}
              como receita no financeiro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFreelanceDialogOpen(false)}>
              Nao, obrigado
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAddFreelanceIncome}
              disabled={addingIncome}
            >
              {addingIncome ? "Adicionando..." : "Sim, adicionar receita"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
