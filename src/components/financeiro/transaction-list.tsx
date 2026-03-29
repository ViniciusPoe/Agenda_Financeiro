"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  RepeatIcon,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryBadge } from "@/components/financeiro/category-badge";
import { cn, formatCurrency, formatDate, toDateOnlyString } from "@/lib/utils";
import type { Transaction } from "@/types/financeiro";

interface TransactionListProps {
  transactions: Transaction[];
  onDeleted?: (id: string) => void;
  onUpdated?: (transaction: Transaction) => void;
}

function toDateKey(date: Date | string): string {
  return toDateOnlyString(date);
}

function getDateLabel(dateStr: string): string {
  const today = toDateOnlyString(new Date());
  const yesterday = toDateOnlyString(new Date(Date.now() - 86400000));
  const tomorrow = toDateOnlyString(new Date(Date.now() + 86400000));

  if (dateStr === today) return "Hoje";
  if (dateStr === yesterday) return "Ontem";
  if (dateStr === tomorrow) return "Amanha";

  const d = new Date(dateStr + "T12:00:00");
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(d);
}

interface TransactionCardProps {
  transaction: Transaction;
  onDeleted?: (id: string) => void;
  onUpdated?: (transaction: Transaction) => void;
}

function TransactionCard({ transaction, onDeleted, onUpdated }: TransactionCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingPaid, setTogglingPaid] = useState(false);

  const isIncome = transaction.type === "INCOME";
  const isPaid = transaction.paid;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/financeiro/transacoes/${transaction.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao excluir transacao");
        return;
      }
      toast.success("Transacao excluida");
      setDeleteOpen(false);
      onDeleted?.(transaction.id);
      router.refresh();
    } catch {
      toast.error("Erro ao excluir transacao");
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePaid() {
    setTogglingPaid(true);
    try {
      const res = await fetch(`/api/financeiro/transacoes/${transaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !isPaid }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao atualizar pagamento");
        return;
      }
      toast.success(
        !isPaid
          ? isIncome ? "Receita marcada como recebida!" : "Despesa marcada como paga!"
          : "Status revertido"
      );
      onUpdated?.(json.data);
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar pagamento");
    } finally {
      setTogglingPaid(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md",
          "border-l-4",
          isIncome ? "border-l-green-500" : "border-l-red-500",
          !isPaid && "opacity-80"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Botao de pago */}
          <button
            onClick={handleTogglePaid}
            disabled={togglingPaid}
            title={isPaid ? "Marcar como pendente" : isIncome ? "Marcar como recebido" : "Marcar como pago"}
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
              isPaid
                ? isIncome
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-emerald-500 border-emerald-500 text-white"
                : "border-muted-foreground hover:border-primary"
            )}
          >
            {isPaid && <CheckCircle2 className="h-4 w-4" />}
          </button>

          {/* Conteudo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isIncome ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  )}
                  <h3 className={cn(
                    "font-medium text-sm leading-tight truncate",
                    !isPaid && "text-muted-foreground"
                  )}>
                    {transaction.description}
                  </h3>
                  {transaction.isRecurring && (
                    <RepeatIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>

              {/* Valor + acoes */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn(
                    "font-bold text-sm",
                    isIncome ? "text-green-600" : "text-red-600"
                  )}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </span>

                {/* Acoes - visivel no hover */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/financeiro/transacoes/${transaction.id}`}>
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
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <CategoryBadge category={transaction.category} size="sm" />

              {!isPaid && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                  <Circle className="h-2.5 w-2.5" />
                  Pendente
                </span>
              )}

              {transaction.dueDate && !isPaid && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Vence {formatDate(transaction.dueDate)}
                </span>
              )}

              {transaction.notes && (
                <span className="text-xs text-muted-foreground truncate max-w-xs">
                  {transaction.notes}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir transacao"
        description={`Tem certeza que deseja excluir "${transaction.description}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />
    </>
  );
}

export function TransactionList({
  transactions,
  onDeleted,
  onUpdated,
}: TransactionListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = toDateKey(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const sorted = Array.from(map.entries()).sort(([a], [b]) =>
      b.localeCompare(a) // descending — most recent first
    );
    return sorted;
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={TrendingDown}
        title="Nenhuma transacao encontrada"
        description="Tente ajustar os filtros ou crie uma nova transacao."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateKey, dayTransactions]) => {
        const dayIncome = dayTransactions
          .filter((t) => t.type === "INCOME")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const dayExpense = dayTransactions
          .filter((t) => t.type === "EXPENSE")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        return (
          <div key={dateKey}>
            {/* Cabecalho do grupo de data */}
            <div className="flex items-center gap-3 mb-3">
              <h2
                className={cn(
                  "text-sm font-semibold capitalize",
                  dateKey === toDateOnlyString(new Date())
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {getDateLabel(dateKey)}
              </h2>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-3 text-xs">
                {dayIncome > 0 && (
                  <span className="text-green-600 font-medium">
                    +{formatCurrency(dayIncome)}
                  </span>
                )}
                {dayExpense > 0 && (
                  <span className="text-red-600 font-medium">
                    -{formatCurrency(dayExpense)}
                  </span>
                )}
              </div>
            </div>

            {/* Transacoes do dia */}
            <div className="space-y-2">
              {dayTransactions.map((t) => (
                <TransactionCard
                  key={t.id}
                  transaction={t}
                  onDeleted={onDeleted}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
