"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
import { createEventSchema } from "@/lib/validators";
import type { z } from "zod";
import {
  EVENT_PRIORITY_LABELS,
  EVENT_STATUS_LABELS,
} from "@/lib/constants";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaCategory, AgendaEvent } from "@/types/agenda";
import { RecurrenceSelector } from "@/components/agenda/recurrence-selector";

type FormValues = z.output<typeof createEventSchema>;

interface EventFormProps {
  event?: AgendaEvent;
  defaultDate?: string;
}

type RecurrenceEditScope = "this" | "this_and_future";

export function EventForm({ event, defaultDate }: EventFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<AgendaCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);
  const [showScopeDialog, setShowScopeDialog] = useState(false);

  const isEditing = !!event;
  const isRecurrenceInstance = !!event?.parentEventId;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createEventSchema) as Resolver<FormValues>,
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      date: event?.date
        ? toDateOnlyString(event.date)
        : defaultDate
          ? toDateOnlyString(defaultDate)
          : toDateOnlyString(new Date()),
      startTime: event?.startTime ?? undefined,
      endTime: event?.endTime ?? undefined,
      allDay: event?.allDay ?? false,
      priority: event?.priority ?? "MEDIUM",
      status: event?.status ?? "PENDING",
      categoryId: event?.categoryId ?? undefined,
      recurrenceRule: event?.recurrenceRule ?? undefined,
      recurrenceEnd: event?.recurrenceEnd
        ? toDateOnlyString(event.recurrenceEnd)
        : undefined,
      isFreelancer: event?.isFreelancer ?? false,
      freelanceAmount: event?.freelanceAmount ?? undefined,
    },
  });

  const allDay = watch("allDay");
  const priority = watch("priority");
  const status = watch("status");
  const categoryId = watch("categoryId");
  const recurrenceRule = watch("recurrenceRule");
  const recurrenceEnd = watch("recurrenceEnd");
  const watchedDate = watch("date");
  const isFreelancer = watch("isFreelancer");
  const selectedCategory = categories.find((cat) => cat.id === categoryId);

  useEffect(() => {
    fetch("/api/agenda/categorias")
      .then((response) => response.json())
      .then((response) => {
        if (response.data) {
          setCategories(response.data);
        }
      })
      .catch(() => {});
  }, []);

  function buildCreatePayload(data: FormValues) {
    return {
      ...data,
      startTime: data.allDay ? undefined : data.startTime ?? undefined,
      endTime: data.allDay ? undefined : data.endTime ?? undefined,
      categoryId: data.categoryId ?? undefined,
      recurrenceRule: data.recurrenceRule ?? undefined,
      recurrenceEnd: data.recurrenceRule
        ? data.recurrenceEnd ?? undefined
        : undefined,
      isFreelancer: data.isFreelancer,
      freelanceAmount: data.isFreelancer
        ? data.freelanceAmount ?? undefined
        : undefined,
    };
  }

  function buildUpdatePayload(data: FormValues) {
    return {
      ...data,
      startTime: data.allDay ? null : data.startTime ?? null,
      endTime: data.allDay ? null : data.endTime ?? null,
      categoryId: data.categoryId ?? null,
      recurrenceRule: data.recurrenceRule ?? null,
      recurrenceEnd: data.recurrenceRule ? data.recurrenceEnd ?? null : null,
      isFreelancer: data.isFreelancer,
      freelanceAmount: data.isFreelancer ? data.freelanceAmount ?? null : null,
    };
  }

  async function applyThisAndFuture(data: FormValues, instanceDate: string) {
    const response = await fetch(`/api/agenda/${event?.id}/split-series`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildUpdatePayload(data),
        date: instanceDate,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Erro ao dividir serie recorrente");
      throw new Error("Failed to create new parent");
    }
  }

  async function submitEvent(data: FormValues, scope?: RecurrenceEditScope) {
    setLoading(true);

    try {
      if (isEditing && isRecurrenceInstance && scope === "this_and_future") {
        await applyThisAndFuture(data, data.date);
      } else {
        const url = isEditing ? `/api/agenda/${event.id}` : "/api/agenda";
        const method = isEditing ? "PUT" : "POST";
        const payload = isEditing
          ? buildUpdatePayload(data)
          : buildCreatePayload(data);

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await response.json();

        if (!response.ok) {
          toast.error(json.error ?? "Erro ao salvar evento");
          return;
        }
      }

      toast.success(isEditing ? "Evento atualizado!" : "Evento criado!");
      router.push("/agenda");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar evento");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(data: FormValues) {
    if (isEditing && isRecurrenceInstance) {
      setPendingData(data);
      setShowScopeDialog(true);
      return;
    }

    void submitEvent(data);
  }

  function handleScopeChoice(scope: RecurrenceEditScope) {
    setShowScopeDialog(false);
    if (!pendingData) return;

    void submitEvent(pendingData, scope);
    setPendingData(null);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Titulo *</Label>
          <Input
            id="title"
            placeholder="Digite o titulo do evento"
            {...register("title")}
            aria-invalid={!!errors.title}
            className={cn(errors.title && "border-destructive")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descricao</Label>
          <Textarea
            id="description"
            placeholder="Descricao opcional"
            rows={3}
            {...register("description")}
            className="resize-none"
          />
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

        <div className="flex items-center gap-2">
          <input
            id="allDay"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...register("allDay")}
            onChange={(e) => setValue("allDay", e.target.checked)}
          />
          <Label htmlFor="allDay" className="cursor-pointer font-normal">
            Dia inteiro
          </Label>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input
                id="startTime"
                type="time"
                {...register("startTime")}
                aria-invalid={!!errors.startTime}
                className={cn(errors.startTime && "border-destructive")}
              />
              {errors.startTime && (
                <p className="text-xs text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Hora de termino</Label>
              <Input
                id="endTime"
                type="time"
                {...register("endTime")}
                aria-invalid={!!errors.endTime}
                className={cn(errors.endTime && "border-destructive")}
              />
              {errors.endTime && (
                <p className="text-xs text-destructive">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setValue(
                  "priority",
                  (value ?? "MEDIUM") as FormValues["priority"]
                )
              }
            >
              <SelectTrigger className="w-full">
                <span data-slot="select-value" className="flex flex-1 text-left">
                  {priority ? EVENT_PRIORITY_LABELS[priority] : "Selecione"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setValue("status", (value ?? "PENDING") as FormValues["status"])
              }
            >
              <SelectTrigger className="w-full">
                <span data-slot="select-value" className="flex flex-1 text-left">
                  {status ? EVENT_STATUS_LABELS[status] : "Selecione"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={categoryId ?? ""}
            onValueChange={(value) =>
              setValue("categoryId", value === "none" || !value ? undefined : value)
            }
          >
            <SelectTrigger className="w-full">
              <span
                data-slot="select-value"
                className={cn(
                  "flex flex-1 items-center gap-2 text-left",
                  !selectedCategory && "text-muted-foreground"
                )}
              >
                {selectedCategory ? (
                  <>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    {selectedCategory.name}
                  </>
                ) : (
                  "Sem categoria"
                )}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isRecurrenceInstance && (
          <RecurrenceSelector
            value={recurrenceRule}
            recurrenceEnd={recurrenceEnd}
            baseDate={watchedDate}
            onChange={(rule) => setValue("recurrenceRule", rule)}
            onEndChange={(date) => setValue("recurrenceEnd", date)}
          />
        )}

        {isRecurrenceInstance && (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Este e um evento recorrente. Ao salvar, voce podera escolher se a
            alteracao se aplica apenas a esta ocorrencia ou a esta e todas as
            futuras.
          </p>
        )}

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="isFreelancer"
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              {...register("isFreelancer")}
              onChange={(e) => setValue("isFreelancer", e.target.checked)}
            />
            <Label
              htmlFor="isFreelancer"
              className="flex cursor-pointer items-center gap-1.5 font-medium"
            >
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Evento freelancer
            </Label>
          </div>

          {isFreelancer && (
            <div className="space-y-1.5">
              <Label htmlFor="freelanceAmount">Valor cobrado (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="freelanceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-9"
                  {...register("freelanceAmount")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ao concluir o evento, sera sugerido lancar este valor como
                receita no financeiro.
              </p>
            </div>
          )}
        </div>

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
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar alteracoes" : "Criar evento"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar evento recorrente</AlertDialogTitle>
            <AlertDialogDescription>
              Como voce deseja aplicar as alteracoes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowScopeDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={() => handleScopeChoice("this")}
              disabled={loading}
            >
              So este evento
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleScopeChoice("this_and_future")}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Este e todos futuros
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
