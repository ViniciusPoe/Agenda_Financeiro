import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);

    // Validate month and year
    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mes invalido" }, { status: 400 });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano invalido" }, { status: 400 });
    }

    // Date range for the month
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59);

    const where = {
      date: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    // Aggregate INCOME and EXPENSE separately — database-level SUM with Decimal precision
    const [incomeAgg, expenseAgg, pendingCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: "INCOME" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.count({
        where: { ...where, paid: false },
      }),
    ]);

    // Convert Decimal sums to string for JSON serialization (never float arithmetic)
    const totalIncomeStr = incomeAgg._sum.amount != null ? String(incomeAgg._sum.amount) : "0";
    const totalExpenseStr = expenseAgg._sum.amount != null ? String(expenseAgg._sum.amount) : "0";

    // Balance = SUM(INCOME) - SUM(EXPENSE) — computed at string level to avoid float imprecision
    const totalIncome = parseFloat(totalIncomeStr);
    const totalExpense = parseFloat(totalExpenseStr);
    const balance = totalIncome - totalExpense;

    return NextResponse.json({
      data: {
        month,
        year,
        totalIncome: totalIncomeStr,
        totalExpense: totalExpenseStr,
        balance: balance.toFixed(2),
        incomeCount: incomeAgg._count,
        expenseCount: expenseAgg._count,
        pendingCount,
      },
    });
  } catch (error) {
    console.error("[GET /api/financeiro/saldo]", error);
    return NextResponse.json(
      { error: "Erro ao calcular saldo" },
      { status: 500 }
    );
  }
}
