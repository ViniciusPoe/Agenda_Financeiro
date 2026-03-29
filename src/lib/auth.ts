import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { validateSession } from "@/lib/session";

const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? String(10 * 60 * 1000)
);
const AUTH_RATE_LIMIT_MAX_ATTEMPTS = parseInt(
  process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ?? "10"
);
const AUTH_RATE_LIMIT_LOCKOUT_MS = parseInt(
  process.env.AUTH_RATE_LIMIT_LOCKOUT_MS ?? String(15 * 60 * 1000)
);

const SESSION_COOKIE_NAME = "session_token";

type InMemoryRateLimitEntry = {
  attempts: number;
  windowStartedAt: number;
  lockedUntil: number | null;
};

const globalForAuthRateLimit = globalThis as typeof globalThis & {
  authRateLimitFallbackStore: Map<string, InMemoryRateLimitEntry> | undefined;
};

const authRateLimitFallbackStore =
  globalForAuthRateLimit.authRateLimitFallbackStore ?? new Map();

globalForAuthRateLimit.authRateLimitFallbackStore =
  authRateLimitFallbackStore;

function isRateLimitInfraError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");
  const normalized = message.toLowerCase();

  return (
    message.includes("login_rate_limits") ||
    message.includes("LoginRateLimit") ||
    message.includes("does not exist") ||
    message.includes("Unknown table") ||
    message.includes("Unknown column") ||
    normalized.includes("too many connections") ||
    normalized.includes("pool timeout") ||
    normalized.includes("failed to retrieve a connection from pool") ||
    normalized.includes("can't reach database server") ||
    normalized.includes("cannot reach database server") ||
    normalized.includes("server has gone away") ||
    normalized.includes("connection refused")
  );
}

function warnRateLimitFallback(error: unknown) {
  console.warn("[auth] falling back to in-memory login rate limit", error);
}

function getFallbackStatus(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = authRateLimitFallbackStore.get(key);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((entry.lockedUntil - now) / 1000)
      ),
    };
  }

  if (now - entry.windowStartedAt > AUTH_RATE_LIMIT_WINDOW_MS) {
    authRateLimitFallbackStore.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

function registerFallbackAttempt(key: string) {
  const now = Date.now();
  const entry = authRateLimitFallbackStore.get(key);

  if (!entry || now - entry.windowStartedAt > AUTH_RATE_LIMIT_WINDOW_MS) {
    authRateLimitFallbackStore.set(key, {
      attempts: 1,
      windowStartedAt: now,
      lockedUntil: null,
    });
    return;
  }

  const attempts = entry.attempts + 1;
  authRateLimitFallbackStore.set(key, {
    attempts,
    windowStartedAt: entry.windowStartedAt,
    lockedUntil:
      attempts >= AUTH_RATE_LIMIT_MAX_ATTEMPTS
        ? now + AUTH_RATE_LIMIT_LOCKOUT_MS
        : entry.lockedUntil,
  });
}

function clearFallbackAttempts(key: string) {
  authRateLimitFallbackStore.delete(key);
}

export async function hashPassword(password: string): Promise<string> {
  const rounds = parseInt(process.env.AUTH_SALT_ROUNDS ?? "12");
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const storedPassword = process.env.AUTH_PASSWORD;
  if (!storedPassword) return false;

  if (storedPassword.startsWith("$2")) {
    return bcrypt.compare(password, storedPassword);
  }

  const expected = Buffer.from(storedPassword);
  const received = Buffer.from(password);
  const length = Math.max(expected.length, received.length, 1);
  const paddedExpected = Buffer.alloc(length);
  const paddedReceived = Buffer.alloc(length);

  expected.copy(paddedExpected);
  received.copy(paddedReceived);

  return expected.length === received.length &&
    timingSafeEqual(paddedExpected, paddedReceived);
}

export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getSessionToken();
  if (!token) return false;
  return validateSession(token);
}

export function getRateLimitKey(
  ip: string | undefined,
  userAgent?: string | undefined
): string {
  const normalizedIp = ip?.trim() || "unknown";
  const normalizedUserAgent = userAgent?.trim() || "unknown";

  return createHash("sha256")
    .update(`${normalizedIp}|${normalizedUserAgent}`)
    .digest("hex");
}

export async function getLoginRateLimitStatus(key: string): Promise<{
  allowed: boolean;
  retryAfterSeconds: number;
}> {
  try {
    const now = Date.now();
    const entry = await prisma.loginRateLimit.findUnique({
      where: { key },
    });

    if (!entry) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const lockedUntil = entry.lockedUntil?.getTime() ?? null;

    if (lockedUntil && lockedUntil > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((lockedUntil - now) / 1000)
        ),
      };
    }

    if (now - entry.windowStartedAt.getTime() > AUTH_RATE_LIMIT_WINDOW_MS) {
      await prisma.loginRateLimit.delete({ where: { key } }).catch(() => {});
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    if (isRateLimitInfraError(error)) {
      warnRateLimitFallback(error);
      return getFallbackStatus(key);
    }

    throw error;
  }
}

export async function registerFailedLoginAttempt(key: string) {
  try {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      const entry = await tx.loginRateLimit.findUnique({
        where: { key },
      });

      if (
        !entry ||
        now.getTime() - entry.windowStartedAt.getTime() >
          AUTH_RATE_LIMIT_WINDOW_MS
      ) {
        await tx.loginRateLimit.upsert({
          where: { key },
          update: {
            attempts: 1,
            windowStartedAt: now,
            lockedUntil: null,
          },
          create: {
            key,
            attempts: 1,
            windowStartedAt: now,
            lockedUntil: null,
          },
        });
        return;
      }

      const attempts = entry.attempts + 1;
      const lockedUntil =
        attempts >= AUTH_RATE_LIMIT_MAX_ATTEMPTS
          ? new Date(now.getTime() + AUTH_RATE_LIMIT_LOCKOUT_MS)
          : entry.lockedUntil;

      await tx.loginRateLimit.update({
        where: { key },
        data: {
          attempts,
          lockedUntil,
        },
      });
    });
  } catch (error) {
    if (isRateLimitInfraError(error)) {
      warnRateLimitFallback(error);
      registerFallbackAttempt(key);
      return;
    }

    throw error;
  }
}

export async function clearFailedLoginAttempts(key: string) {
  try {
    await prisma.loginRateLimit.delete({ where: { key } }).catch(() => {});
  } catch (error) {
    if (isRateLimitInfraError(error)) {
      warnRateLimitFallback(error);
    }
  }

  clearFallbackAttempts(key);
}

export { SESSION_COOKIE_NAME };
