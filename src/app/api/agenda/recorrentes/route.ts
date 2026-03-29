import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateRecurrenceDatesForMonth } from "@/hooks/use-recurrence";
import type { EventPriority, EventStatus } from "@/generated/prisma/enums";

const recorrenciaSchema = z.object({
  eventId: z.string().min(1, "eventId obrigatorio"),
  targetMonth: z.number().int().min(0).max(11),
  targetYear: z.number().int().min(2020).max(2100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = recorrenciaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { eventId, targetMonth, targetYear } = parsed.data;

    // Busca o evento pai — deve ter recurrenceRule definido
    const parent = await prisma.agendaEvent.findUnique({
      where: { id: eventId },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    if (!parent.recurrenceRule) {
      return NextResponse.json(
        { error: "Evento nao possui regra de recorrencia" },
        { status: 400 }
      );
    }

    // Garante que so eventos originais (sem parentEventId) sejam usados como pai
    if (parent.parentEventId) {
      return NextResponse.json(
        { error: "Use o evento pai original para gerar instancias" },
        { status: 400 }
      );
    }

    // Gera as datas de ocorrencia para o mes/ano solicitado
    const occurrences = generateRecurrenceDatesForMonth(
      parent.recurrenceRule,
      new Date(parent.date),
      targetMonth,
      targetYear,
      parent.recurrenceEnd
    );

    if (occurrences.length === 0) {
      return NextResponse.json({ data: [], count: 0 });
    }

    // Busca instancias ja existentes neste periodo para este pai
    const monthStart = new Date(targetYear, targetMonth, 1);
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const existing = await prisma.agendaEvent.findMany({
      where: {
        parentEventId: eventId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
    });

    // Indexa instancias existentes por data (YYYY-MM-DD) para lookup O(1)
    const existingByDate = new Map<string, typeof existing[number]>();
    for (const inst of existing) {
      const key = toDateKey(new Date(inst.date));
      existingByDate.set(key, inst);
    }

    // Cria instancias faltantes em batch
    const toCreate: Array<{
      title: string;
      description: string | null;
      date: Date;
      startTime: string | null;
      endTime: string | null;
      allDay: boolean;
      priority: EventPriority;
      status: EventStatus;
      categoryId: string | null;
      parentEventId: string;
    }> = [];

    for (const occDate of occurrences) {
      const key = toDateKey(occDate);
      if (!existingByDate.has(key)) {
        // Normaliza para meia-noite local para consistencia com o resto do sistema
        const normalized = new Date(
          occDate.getUTCFullYear(),
          occDate.getUTCMonth(),
          occDate.getUTCDate(),
          0, 0, 0, 0
        );

        toCreate.push({
          title: parent.title,
          description: parent.description,
          date: normalized,
          startTime: parent.startTime,
          endTime: parent.endTime,
          allDay: parent.allDay,
          priority: parent.priority,
          status: "PENDING", // instancias sempre iniciam como pendente
          categoryId: parent.categoryId,
          parentEventId: eventId,
        });
      }
    }

    // Usa createMany com skipDuplicates para evitar corridas entre geracoes concorrentes
    const createResult =
      toCreate.length > 0
        ? await prisma.agendaEvent.createMany({
            data: toCreate,
            skipDuplicates: true,
          })
        : { count: 0 };

    // Busca todas as instancias do periodo (existentes + recém-criadas)
    const allInstances = await prisma.agendaEvent.findMany({
      where: {
        parentEventId: eventId,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      data: allInstances,
      count: allInstances.length,
      created: createResult.count,
    });
  } catch (error) {
    console.error("[POST /api/agenda/recorrentes]", error);
    return NextResponse.json(
      { error: "Erro ao gerar instancias de recorrencia" },
      { status: 500 }
    );
  }
}

/** Retorna chave "YYYY-MM-DD" a partir de uma data UTC (como retornado pelo rrule) */
function toDateKey(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}
