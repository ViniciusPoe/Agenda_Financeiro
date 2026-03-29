"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

const REMINDER_LOOKAHEAD_MINUTES = 30;
const REMINDER_POLL_INTERVAL_MS = 60_000;
const STATUS_SYNC_INTERVAL_MS = 5 * 60_000;
const REMINDER_THROTTLE_KEY = "agenda-reminder-poll-at-v1";
const STATUS_SYNC_THROTTLE_KEY = "agenda-status-sync-at-v1";
const SEEN_ALERTS_STORAGE_KEY = "agenda-seen-alerts-v1";
const PERMISSION_PROMPT_STORAGE_KEY = "agenda-notification-prompted-v1";

interface ReminderAlert {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  reminderMinutes: number;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  eventDateTime: string;
  reminderAt: string;
  alertKey: string;
}

interface StatusSyncResponse {
  updated: number;
  inProgress: number;
  completed: number;
  updatedIds: string[];
}

export function AgendaAutomation() {
  const router = useRouter();
  const pathname = usePathname();
  const seenAlertsRef = useRef<Set<string>>(new Set());
  const reminderInFlightRef = useRef(false);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    seenAlertsRef.current = loadSeenAlerts();
    maybePromptNotificationPermission();

    // Register service worker to keep it updated for push notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let cancelled = false;

    async function runReminderPoll(force = false) {
      if (cancelled) return;
      if (!shouldPollRemindersForPath(pathname)) return;
      if (!isDocumentVisible()) return;
      if (!force && !claimAutomationWindow(REMINDER_THROTTLE_KEY, 45_000)) {
        return;
      }
      if (reminderInFlightRef.current) return;

      reminderInFlightRef.current = true;
      try {
        await fetchReminderAlerts(seenAlertsRef.current);
      } finally {
        reminderInFlightRef.current = false;
      }
    }

    async function runStatusSync(force = false) {
      if (cancelled) return;
      if (!shouldSyncStatusesForPath(pathname)) return;
      if (!isDocumentVisible()) return;
      if (!force && !claimAutomationWindow(STATUS_SYNC_THROTTLE_KEY, 4 * 60_000)) {
        return;
      }
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
      try {
        await syncStatuses(pathname, router);
      } finally {
        syncInFlightRef.current = false;
      }
    }

    void runReminderPoll(true);
    void runStatusSync(true);

    const reminderIntervalId = window.setInterval(() => {
      void runReminderPoll();
    }, REMINDER_POLL_INTERVAL_MS);

    const statusSyncIntervalId = window.setInterval(() => {
      void runStatusSync();
    }, STATUS_SYNC_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void runReminderPoll();
        void runStatusSync();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(reminderIntervalId);
      window.clearInterval(statusSyncIntervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [pathname, router]);

  return null;
}

async function syncStatuses(pathname: string, router: ReturnType<typeof useRouter>) {
  try {
    const res = await fetch("/api/agenda/sincronizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok || !json.data) {
      return;
    }

    const data = json.data as StatusSyncResponse;
    if (data.updated === 0) {
      return;
    }

    const pieces: string[] = [];
    if (data.inProgress > 0) {
      pieces.push(`${data.inProgress} em andamento`);
    }
    if (data.completed > 0) {
      pieces.push(`${data.completed} concluido(s)`);
    }

    toast.info(`Agenda sincronizada: ${pieces.join(" | ")}`);

    if (shouldRefreshPath(pathname)) {
      router.refresh();
    }
  } catch {
    // silencioso: automacao nao deve quebrar a navegacao
  }
}

async function fetchReminderAlerts(seenAlerts: Set<string>) {
  try {
    const res = await fetch(
      `/api/agenda/lembretes?minutes=${REMINDER_LOOKAHEAD_MINUTES}`
    );
    const json = await res.json();

    if (!res.ok || !Array.isArray(json.data)) {
      return;
    }

    const alerts = json.data as ReminderAlert[];

    for (const alert of alerts) {
      if (seenAlerts.has(alert.alertKey)) {
        continue;
      }

      seenAlerts.add(alert.alertKey);
      persistSeenAlerts(seenAlerts);

      const scheduleLabel = formatScheduleLabel(alert);

      toast.warning(`Lembrete: ${alert.title}`, {
        description: scheduleLabel,
        duration: 12_000,
      });

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        new Notification("Lembrete da Agenda", {
          body: `${alert.title} • ${scheduleLabel}`,
          tag: alert.alertKey,
        });
      }
    }
  } catch {
    // silencioso: automacao nao deve quebrar a navegacao
  }
}

function maybePromptNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "default") {
    return;
  }

  if (window.localStorage.getItem(PERMISSION_PROMPT_STORAGE_KEY) === "1") {
    return;
  }

  window.localStorage.setItem(PERMISSION_PROMPT_STORAGE_KEY, "1");

  toast.info("Ative as notificacoes do navegador para receber alertas da agenda.", {
    duration: 15_000,
    action: {
      label: "Ativar",
      onClick: async () => {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          await subscribeToPush();
          toast.success("Notificações ativadas.");
        } else {
          toast.info("Notificações continuam desativadas.");
        }
      },
    },
  });
}

function shouldRefreshPath(pathname: string) {
  return (
    pathname === "/agenda" ||
    pathname === "/agenda/relatorios"
  );
}

function shouldSyncStatusesForPath(pathname: string) {
  return pathname === "/agenda" || pathname === "/agenda/relatorios";
}

function shouldPollRemindersForPath(pathname: string) {
  return pathname.startsWith("/agenda");
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function claimAutomationWindow(storageKey: string, intervalMs: number) {
  if (typeof window === "undefined") {
    return true;
  }

  const now = Date.now();
  const previous = Number(window.localStorage.getItem(storageKey) ?? "0");

  if (Number.isFinite(previous) && now - previous < intervalMs) {
    return false;
  }

  window.localStorage.setItem(storageKey, String(now));
  return true;
}

function loadSeenAlerts() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.localStorage.getItem(SEEN_ALERTS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const seen = new Set<string>();

    for (const [key, timestamp] of Object.entries(parsed)) {
      if (new Date(timestamp).getTime() >= cutoff) {
        seen.add(key);
      }
    }

    return seen;
  } catch {
    return new Set<string>();
  }
}

function persistSeenAlerts(seenAlerts: Set<string>) {
  if (typeof window === "undefined") {
    return;
  }

  const now = new Date().toISOString();
  const trimmed = Array.from(seenAlerts).slice(-300);
  const payload = Object.fromEntries(trimmed.map((key) => [key, now]));

  window.localStorage.setItem(
    SEEN_ALERTS_STORAGE_KEY,
    JSON.stringify(payload)
  );
}

async function subscribeToPush() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return; // Already subscribed

    function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const buffer = new ArrayBuffer(rawData.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < rawData.length; i++) {
        view[i] = rawData.charCodeAt(i);
      }
      return view;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const json = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
  } catch {
    // silencioso: nao bloquear o fluxo normal
  }
}

function formatScheduleLabel(alert: ReminderAlert) {
  const eventDate = new Date(`${alert.date.slice(0, 10)}T12:00:00`);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(eventDate);

  if (alert.startTime) {
    return `${dateLabel} às ${alert.startTime}`;
  }

  return `${dateLabel} (dia inteiro)`;
}
