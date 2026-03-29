import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTransactionSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[GET /api/financeiro/transacoes/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao buscar transacao" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const effectiveIsRecurring = data.isRecurring ?? existing.isRecurring;
    const effectiveRecurrenceRule =
      data.recurrenceRule !== undefined
        ? data.recurrenceRule
        : existing.recurrenceRule;

    if (effectiveIsRecurring && !effectiveRecurrenceRule) {
      return NextResponse.json(
        { error: "Regra de recorrencia obrigatoria para transacoes recorrentes" },
        { status: 400 }
      );
    }

    if (data.recurrenceEnd && !effectiveRecurrenceRule) {
      return NextResponse.json(
        {
          error:
            "Defina a regra antes de informar a data final da recorrencia",
        },
        { status: 400 }
      );
    }

    // Validate the effective category/type pair when either side changes
    if (data.categoryId !== undefined || data.type !== undefined) {
      const effectiveCategoryId = data.categoryId ?? existing.categoryId;
      const effectiveType = data.type ?? existing.type;
      const category = await prisma.financeCategory.findUnique({
        where: { id: effectiveCategoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 400 }
        );
      }
      if (category.type !== effectiveType) {
        return NextResponse.json(
          { error: "Tipo da categoria nao corresponde ao tipo da transacao" },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.date !== undefined) updateData.date = new Date(data.date + "T00:00:00");
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrenceRule !== undefined)
      updateData.recurrenceRule = data.recurrenceRule ?? null;
    if (data.recurrenceEnd !== undefined) {
      updateData.recurrenceEnd = data.recurrenceEnd
        ? new Date(data.recurrenceEnd + "T00:00:00")
        : null;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate
        ? new Date(data.dueDate + "T00:00:00")
        : null;
    }
    if (data.isRecurring === false) {
      if (data.recurrenceRule === undefined) updateData.recurrenceRule = null;
      if (data.recurrenceEnd === undefined) updateData.recurrenceEnd = null;
    }

    // Handle paid status — auto-set paidAt when marking as paid
    if (data.paid !== undefined) {
      updateData.paid = data.paid;
      if (data.paid && !existing.paid) {
        // Marking as paid for the first time
        updateData.paidAt = new Date();
      } else if (!data.paid) {
        // Unmarking paid — clear paidAt
        updateData.paidAt = null;
      }
    }

    // Explicit paidAt override
    if (data.paidAt !== undefined) {
      updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    try {
      const agendaEvent = await prisma.agendaEvent.findFirst({
        where: { transactionId: id },
      });
      const shouldHaveAgendaEvent =
        transaction.type === "EXPENSE" && transaction.dueDate !== null;

      if (!shouldHaveAgendaEvent) {
        if (agendaEvent) {
          await prisma.agendaEvent.delete({ where: { id: agendaEvent.id } });
        }
      } else {
        const agendaData = {
          title: `Vencimento: ${transaction.description}`,
          description: `Despesa de ${transaction.category.name}. Valor: R$ ${Number(transaction.amount).toFixed(2)}`,
          date: new Date(transaction.dueDate!),
          allDay: true,
          priority: "HIGH" as const,
          status: transaction.paid ? ("COMPLETED" as const) : ("PENDING" as const),
          completedAt: transaction.paid ? transaction.paidAt ?? new Date() : null,
        };

        if (agendaEvent) {
          await prisma.agendaEvent.update({
            where: { id: agendaEvent.id },
            data: agendaData,
          });
        } else {
          await prisma.agendaEvent.create({
            data: {
              ...agendaData,
              transactionId: id,
            },
          });
        }
      }
    } catch {
      // Non-critical: don't fail if agenda sync fails
    }

    return NextResponse.json({
      data: serializeTransaction(transaction as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PUT /api/financeiro/transacoes/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar transacao" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Transacao nao encontrada" },
        { status: 404 }
      );
    }

    // Check if this transaction is a parent of recurring children
    const childrenCount = await prisma.transaction.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      return NextResponse.json(
        {
          error: "Esta transacao possui transacoes recorrentes vinculadas. Exclua as filhas primeiro ou exclua a serie completa.",
          childrenCount,
        },
        { status: 409 }
      );
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/financeiro/transacoes/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao excluir transacao" },
      { status: 500 }
    );
  }
}
