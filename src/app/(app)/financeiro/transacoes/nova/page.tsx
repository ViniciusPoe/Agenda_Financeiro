import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TransactionForm } from "@/components/financeiro/transaction-form";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default function NovaTransacaoPage() {
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
          <h1 className="text-xl font-bold tracking-tight">Nova transacao</h1>
          <p className="text-sm text-muted-foreground">
            Registre uma receita ou despesa
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <TransactionForm />
      </div>
    </div>
  );
}
