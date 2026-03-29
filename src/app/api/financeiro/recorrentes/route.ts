import { NextRequest, NextResponse } from "next/server";
import { RRule } from "rrule";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const generateSchema = z.object({
  transactionId: z.string().min(1, "ID da transacao obrigatorio"),
  targetMonth: z.number().int().min(1).max(12),
  targetYear: z.number().int().min(2020).max(2100),
});

function serializeTransaction(t: Record<string, unknown>) {
  return {
    ...t,
    amount: String(t.amount),
    category: t.category
      ? {
          ...(t.category as Record<string, unknown>),
          budgetAmount:
            (t.category as Record<string, unknown>).budgetAmount != null
              ? String((t.category as Record<string, unknown>).budgetAmount)
              : null,
        }
      : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { transactionId, targetMonth, targetYear } = parsed.data;

    const parent = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    if (!parent.isRecurring) {
      return NextResponse.json(
        { error: "Esta transacao nao e recorrente" },
        { status: 400 }
      );
    }

    if (!parent.recurrenceRule) {
      return NextResponse.json(
        { error: "Transacao recorrente sem regra de recorrencia definida" },
        { status: 400 }
      );
    }

    if (parent.parentId !== null) {
      return NextResponse.json(
        {
          error: "Esta transacao e uma instancia; use a transacao pai para gerar",
        },
        { status: 400 }
      );
    }

    const periodStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59));

    let rruleStr = parent.recurrenceRule;
    if (!rruleStr.startsWith("RRULE:")) {
      rruleStr = "RRULE:" + rruleStr;
    }

    let rule: RRule;
    try {
      const parsedRule = RRule.fromString(rruleStr);
      rule = new RRule({
        ...parsedRule.origOptions,
        dtstart: new Date(parent.date),
        ...(parent.recurrenceEnd
          ? { until: new Date(parent.recurrenceEnd) }
          : {}),
      });
    } catch {
      return NextResponse.json(
        { error: "Regra de recorrencia invalida" },
        { status: 400 }
      );
    }

    const occurrenceDates = rule.between(periodStart, periodEnd, true);

    if (occurrenceDates.length === 0) {
      return NextResponse.json({
        data: {
          created: [],
          message: "Nenhuma ocorrencia neste periodo",
          totalCreated: 0,
        },
      });
    }

    const existingInstances = await prisma.transaction.findMany({
      where: {
        parentId: transactionId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: { date: true },
    });

    const existingDatesSet = new Set<string>(
      existingInstances.map((instance) => {
        const d = new Date(instance.date);
        return d.toISOString().split("T")[0];
      })
    );

    const datesToCreate = occurrenceDates.filter((date) => {
      const dateStr = date.toISOString().split("T")[0];
      return !existingDatesSet.has(dateStr);
    });

    if (datesToCreate.length === 0) {
      return NextResponse.json({
        data: {
          created: [],
          message: "Todas as ocorrencias deste periodo ja foram geradas",
          totalCreated: 0,
        },
      });
    }

    const { createdCount, allInstances } = await prisma.$transaction(
      async (tx) => {
        const createResult = await tx.transaction.createMany({
          data: datesToCreate.map((occDate) => {
            const dateStr = occDate.toISOString().split("T")[0];
            return {
              description: parent.description,
              amount: parent.amount,
              type: parent.type,
              date: new Date(dateStr + "T00:00:00"),
              categoryId: parent.categoryId,
              isRecurring: false,
              parentId: transactionId,
              paid: false,
              dueDate: new Date(dateStr + "T00:00:00"),
            };
          }),
          skipDuplicates: true,
        });

        const instances = await tx.transaction.findMany({
          where: {
            parentId: transactionId,
            date: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
          include: { category: true },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        });

        await Promise.all(
          instances.map(async (instance) => {
            const shouldHaveAgendaEvent =
              instance.type === "EXPENSE" && instance.dueDate !== null;

            if (!shouldHaveAgendaEvent) {
              await tx.agendaEvent.deleteMany({
                where: { transactionId: instance.id },
              });
              return;
            }

            const agendaData = {
              title: `Vencimento: ${instance.description}`,
              description: `Despesa de ${instance.category.name}. Valor: R$ ${Number(instance.amount).toFixed(2)}`,
              date: new Date(instance.dueDate!),
              allDay: true,
              priority: "HIGH" as const,
              status: instance.paid
                ? ("COMPLETED" as const)
                : ("PENDING" as const),
              completedAt: instance.paid ? instance.paidAt ?? new Date() : null,
            };

            await tx.agendaEvent.upsert({
              where: { transactionId: instance.id },
              update: agendaData,
              create: {
                ...agendaData,
                transactionId: instance.id,
              },
            });
          })
        );

        return {
          createdCount: createResult.count,
          allInstances: instances,
        };
      }
    );

    return NextResponse.json(
      {
        data: {
          created: allInstances.map((instance) =>
            serializeTransaction(instance as unknown as Record<string, unknown>)
          ),
          totalCreated: createdCount,
          message: `${createdCount} ocorrencia(s) criada(s)`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/financeiro/recorrentes]", error);
    return NextResponse.json(
      { error: "Erro ao gerar transacoes recorrentes" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const month = monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Mes invalido" },
        { status: 400 }
      );
    }

    if (isNaN(year) || year < 2020 || year > 2100) {
      return NextResponse.json(
        { error: "Ano invalido" },
        { status: 400 }
      );
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const parents = await prisma.transaction.findMany({
      where: {
        isRecurring: true,
        parentId: null,
      },
      include: { category: true },
      orderBy: [{ type: "asc" }, { description: "asc" }],
    });

    const parentIds = parents.map((parent) => parent.id);
    const groupedCounts =
      parentIds.length > 0
        ? await prisma.transaction.groupBy({
            by: ["parentId"],
            where: {
              parentId: { in: parentIds },
              date: { gte: periodStart, lte: periodEnd },
            },
            _count: {
              _all: true,
            },
          })
        : [];

    const countsByParentId = new Map(
      groupedCounts
        .filter((item) => item.parentId !== null)
        .map((item) => [item.parentId as string, item._count._all])
    );

    const parentsWithStatus = parents.map((parent) => {
      const instancesInMonth = countsByParentId.get(parent.id) ?? 0;

      let expectedCount = 0;
      if (parent.recurrenceRule) {
        try {
          let rruleStr = parent.recurrenceRule;
          if (!rruleStr.startsWith("RRULE:")) {
            rruleStr = "RRULE:" + rruleStr;
          }

          const rule = RRule.fromString(rruleStr);
          const fullRule = new RRule({
            ...rule.origOptions,
            dtstart: new Date(parent.date),
            ...(parent.recurrenceEnd
              ? { until: new Date(parent.recurrenceEnd) }
              : {}),
          });
          expectedCount = fullRule.between(periodStart, periodEnd, true).length;
        } catch {
          expectedCount = 0;
        }
      }

      return {
        ...parent,
        amount: String(parent.amount),
        category: {
          ...parent.category,
          budgetAmount:
            parent.category.budgetAmount != null
              ? String(parent.category.budgetAmount)
              : null,
        },
        recurrenceEnd: parent.recurrenceEnd
          ? parent.recurrenceEnd.toISOString()
          : null,
        instancesInMonth,
        expectedCount,
        generated: instancesInMonth >= expectedCount && expectedCount > 0,
      };
    });

    return NextResponse.json({ data: parentsWithStatus });
  } catch (error) {
    console.error("[GET /api/financeiro/recorrentes]", error);
    return NextResponse.json(
      { error: "Erro ao buscar transacoes recorrentes" },
      { status: 500 }
    );
  }
}
