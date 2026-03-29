import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createTransactionSchema, transactionFiltersSchema } from "@/lib/validators";

// Serialize a transaction record: convert Decimal fields to string
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawFilters = {
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      paid: searchParams.get("paid") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = transactionFiltersSchema.safeParse(rawFilters);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Filtros invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 100) : 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        (where.date as Record<string, unknown>).gte = new Date(filters.dateFrom + "T00:00:00");
      }
      if (filters.dateTo) {
        (where.date as Record<string, unknown>).lte = new Date(filters.dateTo + "T23:59:59");
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.paid !== undefined) {
      where.paid = filters.paid;
    }

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search } },
        { notes: { contains: filters.search } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: transactions.map((t) => serializeTransaction(t as unknown as Record<string, unknown>)),
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("[GET /api/financeiro/transacoes]", error);
    return NextResponse.json(
      { error: "Erro ao buscar transacoes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate category exists and matches transaction type
    const category = await prisma.financeCategory.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 400 }
      );
    }

    if (category.type !== data.type) {
      return NextResponse.json(
        { error: `Categoria e do tipo ${category.type === "INCOME" ? "receita" : "despesa"}, mas a transacao e do tipo ${data.type === "INCOME" ? "receita" : "despesa"}` },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: new Date(data.date + "T00:00:00"),
        notes: data.notes,
        categoryId: data.categoryId,
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule,
        recurrenceEnd: data.recurrenceEnd
          ? new Date(data.recurrenceEnd + "T00:00:00")
          : undefined,
        paid: data.paid ?? false,
        paidAt: data.paid ? new Date() : undefined,
        dueDate: data.dueDate
          ? new Date(data.dueDate + "T00:00:00")
          : undefined,
      },
      include: { category: true },
    });

    // Keep the agenda due-date event in sync for expenses with dueDate
    if (data.dueDate && data.type === "EXPENSE") {
      try {
        await prisma.agendaEvent.create({
          data: {
            title: `Vencimento: ${data.description}`,
            description: `Despesa de ${category.name}. Valor: R$ ${data.amount.toFixed(2)}`,
            date: new Date(data.dueDate + "T00:00:00"),
            allDay: true,
            priority: "HIGH",
            status: data.paid ? "COMPLETED" : "PENDING",
            completedAt: data.paid ? new Date() : undefined,
            transactionId: transaction.id,
          },
        });
      } catch {
        // Non-critical: don't fail transaction creation if event creation fails
      }
    }

    return NextResponse.json(
      { data: serializeTransaction(transaction as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/financeiro/transacoes]", error);
    return NextResponse.json(
      { error: "Erro ao criar transacao" },
      { status: 500 }
    );
  }
}
