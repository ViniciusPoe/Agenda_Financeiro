"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransactionSchema } from "@/lib/validators";
import { cn, toDateOnlyString } from "@/lib/utils";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { RecurrenceSelector } from "@/components/financeiro/recurrence-selector";
import type { z } from "zod";
import type { FinanceCategory, Transaction } from "@/types/financeiro";

type FormValues = z.output<typeof createTransactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  defaultType?: "INCOME" | "EXPENSE";
}

export function TransactionForm({ transaction, defaultType = "EXPENSE" }: TransactionFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const isEditing = !!transaction;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTransactionSchema) as Resolver<FormValues>,
    defaultValues: {
      description: transaction?.description ?? "",
      amount: transaction?.amount ? parseFloat(transaction.amount) : undefined,
      type: transaction?.type ?? defaultType,
      date: transaction?.date
        ? toDateOnlyString(transaction.date)
        : toDateOnlyString(new Date()),
      notes: transaction?.notes ?? "",
      categoryId: transaction?.categoryId ?? "",
      isRecurring: transaction?.isRecurring ?? false,
      recurrenceRule: transaction?.recurrenceRule ?? undefined,
      recurrenceEnd: transaction?.recurrenceEnd
        ? toDateOnlyString(transaction.recurrenceEnd)
        : undefined,
      paid: transaction?.paid ?? false,
      dueDate: transaction?.dueDate
        ? toDateOnlyString(transaction.dueDate)
        : undefined,
    },
  });

  const selectedType = watch("type");
  const isRecurring = watch("isRecurring");
  const paid = watch("paid");
  const categoryId = watch("categoryId");
  const recurrenceRule = watch("recurrenceRule");

  useEffect(() => {
    fetch(`/api/financeiro/categorias${selectedType ? `?type=${selectedType}` : ""}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setCategories(res.data);
          // Clear categoryId if it doesn't belong to the new type
          if (categoryId) {
            const found = (res.data as FinanceCategory[]).find((c) => c.id === categoryId);
            if (!found) setValue("categoryId", "");
          }
        }
      })
      .catch(() => {});
  }, [categoryId, selectedType, setValue]);

  function buildCreatePayload(data: FormValues) {
    return {
      ...data,
      notes: data.notes || undefined,
      recurrenceRule: data.isRecurring ? data.recurrenceRule ?? undefined : undefined,
      recurrenceEnd:
        data.isRecurring && data.recurrenceRule
          ? data.recurrenceEnd ?? undefined
          : undefined,
      dueDate: data.dueDate ?? undefined,
    };
  }

  function buildUpdatePayload(data: FormValues) {
    return {
      ...data,
      notes: data.notes ? data.notes : null,
      recurrenceRule: data.isRecurring ? data.recurrenceRule ?? null : null,
      recurrenceEnd:
        data.isRecurring && data.recurrenceRule
          ? data.recurrenceEnd ?? null
          : null,
      dueDate: data.dueDate ?? null,
    };
  }

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      const payload = isEditing
        ? buildUpdatePayload(data)
        : buildCreatePayload(data);

      const url = isEditing
        ? `/api/financeiro/transacoes/${transaction.id}`
        : "/api/financeiro/transacoes";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erro ao salvar transacao");
        return;
      }

      toast.success(isEditing ? "Transacao atualizada!" : "Transacao criada!");
      router.push("/financeiro/transacoes");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar transacao");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Tipo */}
      <div className="space-y-1.5">
        <Label>Tipo *</Label>
        <div className="flex gap-2">
          {(["INCOME", "EXPENSE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t)}
              className={cn(
                "flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                selectedType === t
                  ? t === "INCOME"
                    ? "bg-green-50 border-green-500 text-green-700"
                    : "bg-red-50 border-red-500 text-red-700"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {TRANSACTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Descricao */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descricao *</Label>
        <Input
          id="description"
          placeholder="Ex: Salario, Aluguel, Supermercado..."
          {...register("description")}
          aria-invalid={!!errors.description}
          className={cn(errors.description && "border-destructive")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Valor e Data */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Valor (R$) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
            {...register("amount", { valueAsNumber: true })}
            aria-invalid={!!errors.amount}
            className={cn(errors.amount && "border-destructive")}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            {...register("date")}
            aria-invalid={!!errors.date}
            className={cn(errors.date && "border-destructive")}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label>Categoria *</Label>
        <Select
          value={categoryId || ""}
          onValueChange={(val) => setValue("categoryId", val ?? "")}
        >
          <SelectTrigger
            className={cn("w-full", errors.categoryId && "border-destructive")}
          >
            <SelectValue>
              {categoryId
                ? (categories.find((c) => c.id === categoryId)?.name ?? "Selecione uma categoria")
                : "Selecione uma categoria"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <SelectItem value="" disabled>
                Nenhuma categoria disponivel
              </SelectItem>
            ) : (
              categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Pago e Data de Vencimento */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 pt-6">
          <input
            id="paid"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register("paid")}
            onChange={(e) => setValue("paid", e.target.checked)}
            checked={paid}
          />
          <Label htmlFor="paid" className="cursor-pointer font-normal">
            {selectedType === "INCOME" ? "Recebido" : "Pago"}
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueDate">Data de vencimento</Label>
          <Input
            id="dueDate"
            type="date"
            {...register("dueDate")}
          />
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Observacoes opcionais..."
          rows={2}
          {...register("notes")}
          className="resize-none"
        />
      </div>

      {/* Recorrente */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            id="isRecurring"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register("isRecurring")}
            onChange={(e) => setValue("isRecurring", e.target.checked)}
            checked={isRecurring}
          />
          <Label htmlFor="isRecurring" className="cursor-pointer font-normal">
            Transacao recorrente
          </Label>
        </div>

        {isRecurring && (
          <div className="pl-6">
            <RecurrenceSelector
              value={recurrenceRule}
              endDate={watch("recurrenceEnd")}
              onValueChange={(val) => setValue("recurrenceRule", val || undefined)}
              onEndDateChange={(date) => setValue("recurrenceEnd", date || undefined)}
            />
          </div>
        )}
      </div>

      {/* Acoes */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className={cn(
            "flex-1",
            selectedType === "INCOME"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          )}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Salvar alteracoes" : `Criar ${selectedType === "INCOME" ? "receita" : "despesa"}`}
        </Button>
      </div>
    </form>
  );
}
