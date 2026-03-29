import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDueReminderAlerts } from "@/lib/agenda-automation";
import { sendPushToAll } from "@/lib/push";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const alerts = await getDueReminderAlerts(prisma, 2);

    if (alerts.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const alertKeys = alerts.map((a) => a.alertKey);
    const alreadySent = await prisma.sentPushAlert.findMany({
      where: { alertKey: { in: alertKeys } },
      select: { alertKey: true },
    });
    const sentKeys = new Set(alreadySent.map((s) => s.alertKey));
    const newAlerts = alerts.filter((a) => !sentKeys.has(a.alertKey));

    for (const alert of newAlerts) {
      const scheduleLabel = alert.startTime
        ? `às ${alert.startTime}`
        : "dia inteiro";

      await sendPushToAll({
        title: "Lembrete da Agenda",
        body: `${alert.title} • ${scheduleLabel}`,
        url: "/agenda",
        tag: alert.alertKey,
      });

      await prisma.sentPushAlert.create({
        data: { alertKey: alert.alertKey },
      });
    }

    // Remove entries older than 7 days to keep the table lean
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.sentPushAlert.deleteMany({ where: { sentAt: { lt: cutoff } } });

    return NextResponse.json({ sent: newAlerts.length });
  } catch (error) {
    console.error("Erro ao enviar push reminders:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
