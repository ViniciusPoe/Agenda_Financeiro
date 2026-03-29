import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      todayEvents,
      upcomingEvents,
      overdueEvents,
      monthIncome,
      monthExpense,
      pendingTransactions,
      recentTransactions,
    ] = await Promise.all([
      // Events today
      prisma.agendaEvent.findMany({
        where: {
          date: { gte: today, lte: todayEnd },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        include: { category: true },
        orderBy: { startTime: "asc" },
        take: 10,
      }),

      // Upcoming events (next 7 days, excluding today)
      prisma.agendaEvent.findMany({
        where: {
          date: { gt: todayEnd, lte: nextWeek },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        include: { category: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 5,
      }),

      // Overdue events
      prisma.agendaEvent.count({
        where: {
          date: { lt: today },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),

      // Month income
      prisma.transaction.aggregate({
        where: {
          type: "INCOME",
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true },
      }),

      // Month expense
      prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        _sum: { amount: true },
      }),

      // Pending transactions (unpaid with dueDate in next 7 days)
      prisma.transaction.count({
        where: {
          paid: false,
          dueDate: { lte: nextWeek },
          type: "EXPENSE",
        },
      }),

      // Recent transactions
      prisma.transaction.findMany({
        where: {
          date: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        },
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ]);

    const totalIncome = parseFloat(String(monthIncome._sum.amount ?? 0));
    const totalExpense = parseFloat(String(monthExpense._sum.amount ?? 0));
    const balance = totalIncome - totalExpense;

    return NextResponse.json({
      agenda: {
        todayCount: todayEvents.length,
        todayEvents: todayEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          priority: e.priority,
          status: e.status,
          category: e.category,
        })),
        upcomingEvents: upcomingEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          priority: e.priority,
          status: e.status,
          category: e.category,
        })),
        overdueCount: overdueEvents,
      },
      financeiro: {
        totalIncome: totalIncome.toFixed(2),
        totalExpense: totalExpense.toFixed(2),
        balance: balance.toFixed(2),
        pendingCount: pendingTransactions,
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          description: t.description,
          amount: String(t.amount),
          type: t.type,
          date: t.date,
          paid: t.paid,
          category: t.category
            ? {
                id: t.category.id,
                name: t.category.name,
                color: t.category.color,
                type: t.category.type,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 });
  }
}
