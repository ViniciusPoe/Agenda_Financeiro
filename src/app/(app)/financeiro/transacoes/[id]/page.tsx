import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TransactionForm } from "@/components/financeiro/transaction-form";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import type { Transaction, FinanceCategory } from "@/types/financeiro";

interface EditTransacaoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransacaoPage({ params }: EditTransacaoPageProps) {
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!transaction) {
    notFound();
  }

  // Serialize Decimal and Date fields for client component
  const serialized: Transaction = {
    id: transaction.id,
    description: transaction.description,
    amount: String(transaction.amount),
    type: transaction.type as Transaction["type"],
    date: transaction.date,
    notes: transaction.notes,
    categoryId: transaction.categoryId,
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type as FinanceCategory["type"],
      color: transaction.category.color,
      icon: transaction.category.icon,
      budgetAmount: transaction.category.budgetAmount != null
        ? String(transaction.category.budgetAmount)
        : null,
      createdAt: transaction.category.createdAt,
    },
    isRecurring: transaction.isRecurring,
    recurrenceRule: transaction.recurrenceRule,
    recurrenceEnd: transaction.recurrenceEnd,
    parentId: transaction.parentId,
    paid: transaction.paid,
    paidAt: transaction.paidAt,
    dueDate: transaction.dueDate,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/financeiro/transacoes"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Editar transacao</h1>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {transaction.description}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <TransactionForm transaction={serialized} />
      </div>
    </div>
  );
}
