import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createEventSchema,
  type UpdateEventInput,
  updateEventSchema,
} from "@/lib/validators";
import { toDateOnlyString } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

type RecurringInstanceSnapshot = {
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  categoryId: string | null;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
  isFreelancer: boolean;
  freelanceAmount: unknown;
  parentEvent: {
    id: string;
    recurrenceRule: string | null;
    recurrenceEnd: Date | null;
    date: Date;
  } | null;
};

function buildCreatePayloadFromInstance(
  instance: RecurringInstanceSnapshot,
  patch: UpdateEventInput
) {
  const parent = instance.parentEvent;
  const allDay = patch.allDay ?? instance.allDay;
  const isFreelancer = patch.isFreelancer ?? instance.isFreelancer;
  const recurrenceRule =
    patch.recurrenceRule !== undefined
      ? patch.recurrenceRule ?? undefined
      : instance.recurrenceRule ??
        parent?.recurrenceRule ??
        undefined;

  const recurrenceEnd =
    patch.recurrenceEnd !== undefined
      ? patch.recurrenceEnd ?? undefined
      : instance.recurrenceEnd
        ? toDateOnlyString(instance.recurrenceEnd)
        : parent?.recurrenceEnd
          ? toDateOnlyString(parent.recurrenceEnd)
          : undefined;

  return {
    title: patch.title ?? instance.title,
    description: patch.description ?? instance.description ?? undefined,
    date: patch.date ?? toDateOnlyString(instance.date),
    startTime: allDay
      ? undefined
      : patch.startTime !== undefined
        ? patch.startTime ?? undefined
        : instance.startTime ?? undefined,
    endTime: allDay
      ? undefined
      : patch.endTime !== undefined
        ? patch.endTime ?? undefined
        : instance.endTime ?? undefined,
    allDay,
    priority: patch.priority ?? instance.priority,
    status: patch.status ?? instance.status,
    categoryId:
      patch.categoryId !== undefined
        ? patch.categoryId ?? undefined
        : instance.categoryId ?? undefined,
    recurrenceRule,
    recurrenceEnd: recurrenceRule ? recurrenceEnd : undefined,
    isFreelancer,
    freelanceAmount: isFreelancer
      ? patch.freelanceAmount !== undefined
        ? patch.freelanceAmount ?? undefined
        : instance.freelanceAmount != null
          ? String(instance.freelanceAmount)
          : undefined
      : undefined,
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        parentEvent: {
          select: {
            id: true,
            recurrenceRule: true,
            recurrenceEnd: true,
            date: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    if (!existing.parentEventId || !existing.parentEvent?.recurrenceRule) {
      return NextResponse.json(
        { error: "Apenas instancias recorrentes podem ser divididas" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nextSeriesPayload = buildCreatePayloadFromInstance(
      existing as RecurringInstanceSnapshot,
      parsed.data
    );
    const createParsed = createEventSchema.safeParse(nextSeriesPayload);

    if (!createParsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: createParsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = createParsed.data;

    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      return NextResponse.json(
        { error: "Hora de termino deve ser depois da hora de inicio" },
        { status: 400 }
      );
    }

    if (data.categoryId) {
      const category = await prisma.agendaCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 400 }
        );
      }
    }

    const splitDate = new Date(data.date + "T00:00:00");
    const previousDate = new Date(splitDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const createdEvent = await prisma.$transaction(async (tx) => {
      const parent = await tx.agendaEvent.findUnique({
        where: { id: existing.parentEventId! },
        select: { id: true, date: true },
      });

      if (!parent) {
        throw new Error("PARENT_NOT_FOUND");
      }

      await tx.agendaEvent.update({
        where: { id: parent.id },
        data: {
          recurrenceEnd: previousDate,
        },
      });

      await tx.agendaEvent.deleteMany({
        where: {
          parentEventId: parent.id,
          date: { gte: splitDate },
        },
      });

      return tx.agendaEvent.create({
        data: {
          title: data.title,
          description: data.description,
          date: splitDate,
          startTime: data.startTime,
          endTime: data.endTime,
          allDay: data.allDay ?? false,
          priority: data.priority ?? "MEDIUM",
          status: data.status ?? "PENDING",
          categoryId: data.categoryId,
          recurrenceRule: data.recurrenceRule,
          recurrenceEnd: data.recurrenceEnd
            ? new Date(data.recurrenceEnd + "T00:00:00")
            : undefined,
          isFreelancer: data.isFreelancer ?? false,
          freelanceAmount:
            data.freelanceAmount != null ? data.freelanceAmount : undefined,
        },
        include: { category: true },
      });
    });

    return NextResponse.json({ data: createdEvent });
  } catch (error) {
    console.error("[POST /api/agenda/[id]/split-series]", error);
    return NextResponse.json(
      { error: "Erro ao dividir serie recorrente" },
      { status: 500 }
    );
  }
}
