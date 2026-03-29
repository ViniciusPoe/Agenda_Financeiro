import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { budgetSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mes invalido" }, { status: 400 });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano invalido" }, { status: 400 });
    }

    // Date range for the month
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59);

    // Fetch budget record for the month (may not exist)
    const budget = await prisma.budget.findUnique({
      where: { month_year: { month, year } },
    });

    // Total expenses this month
    const expenseAgg = await prisma.transaction.aggregate({
      where: { type: "EXPENSE", date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    });

    const totalSpent = parseFloat(String(expenseAgg._sum.amount ?? "0"));
    const totalLimit = budget ? parseFloat(String(budget.totalLimit)) : 0;

    // Expenses by category for this month
    const expensesByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { type: "EXPENSE", date: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    });

    // Fetch all expense categories
    const expenseCategories = await prisma.financeCategory.findMany({
      where: { type: "EXPENSE" },
      orderBy: { name: "asc" },
    });

    // Build category budget items
    const categoryMap = new Map(
      expensesByCategory.map((e) => [
        e.categoryId,
        parseFloat(String(e._sum.amount ?? "0")),
      ])
    );

    const categories = expenseCategories.map((cat) => {
      const spent = categoryMap.get(cat.id) ?? 0;
      const budgetAmount = cat.budgetAmount
        ? parseFloat(String(cat.budgetAmount))
        : null;
      const percentage =
        budgetAmount && budgetAmount > 0
          ? Math.round((spent / budgetAmount) * 100)
          : null;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        color: cat.color,
        icon: cat.icon,
        budgetAmount: budgetAmount !== null ? budgetAmount.toFixed(2) : null,
        spent: spent.toFixed(2),
        percentage,
      };
    });

    const percentage =
      totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

    return NextResponse.json({
      data: {
        month,
        year,
        budget: budget
          ? {
              id: budget.id,
              month: budget.month,
              year: budget.year,
              totalLimit: String(budget.totalLimit),
              notes: budget.notes,
            }
          : null,
        totalLimit: totalLimit.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
        remaining: (totalLimit - totalSpent).toFixed(2),
        percentage,
        categories,
      },
    });
  } catch (error) {
    console.error("[GET /api/financeiro/orcamento]", error);
    return NextResponse.json(
      { error: "Erro ao buscar orcamento" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") ?? "", 10);
    const year = parseInt(searchParams.get("year") ?? "", 10);

    if (isNaN(month) || month < 1 || month > 12 || isNaN(year)) {
      return NextResponse.json({ error: "Mes ou ano invalido" }, { status: 400 });
    }

    await prisma.budget.deleteMany({ where: { month, year } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/financeiro/orcamento]", error);
    return NextResponse.json({ error: "Erro ao excluir orcamento" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = budgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Upsert — create or update budget for the given month/year
    const budget = await prisma.budget.upsert({
      where: { month_year: { month: data.month, year: data.year } },
      create: {
        month: data.month,
        year: data.year,
        totalLimit: data.totalLimit,
        notes: data.notes,
      },
      update: {
        totalLimit: data.totalLimit,
        notes: data.notes,
      },
    });

    return NextResponse.json({
      data: {
        id: budget.id,
        month: budget.month,
        year: budget.year,
        totalLimit: String(budget.totalLimit),
        notes: budget.notes,
      },
    });
  } catch (error) {
    console.error("[PUT /api/financeiro/orcamento]", error);
    return NextResponse.json(
      { error: "Erro ao salvar orcamento" },
      { status: 500 }
    );
  }
}
