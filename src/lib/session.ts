import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS ?? "7");
const SESSION_COOKIE_NAME = "session_token";
const SESSION_VALIDATION_CACHE_MS = parseInt(
  process.env.SESSION_VALIDATION_CACHE_MS ?? "30000"
);

type SessionValidationCacheEntry = {
  cacheUntil: number;
  expiresAt: number;
};

const globalForSession = globalThis as typeof globalThis & {
  sessionValidationCache: Map<string, SessionValidationCacheEntry> | undefined;
};

const sessionValidationCache =
  globalForSession.sessionValidationCache ?? new Map();

globalForSession.sessionValidationCache = sessionValidationCache;

function clearSessionValidationCache(token: string) {
  sessionValidationCache.delete(token);
}

export async function createSession(): Promise<string> {
  const token = randomUUID() + "-" + randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: { token, expiresAt },
  });

  sessionValidationCache.set(token, {
    cacheUntil: Math.min(
      expiresAt.getTime(),
      Date.now() + SESSION_VALIDATION_CACHE_MS
    ),
    expiresAt: expiresAt.getTime(),
  });

  return token;
}

export async function validateSession(token: string): Promise<boolean> {
  const now = Date.now();
  const cached = sessionValidationCache.get(token);

  if (cached && cached.cacheUntil > now && cached.expiresAt > now) {
    return true;
  }

  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) {
    clearSessionValidationCache(token);
    return false;
  }

  if (session.expiresAt.getTime() <= now) {
    clearSessionValidationCache(token);
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return false;
  }

  sessionValidationCache.set(token, {
    cacheUntil: Math.min(
      session.expiresAt.getTime(),
      now + SESSION_VALIDATION_CACHE_MS
    ),
    expiresAt: session.expiresAt.getTime(),
  });

  return true;
}

export async function deleteSession(token: string): Promise<void> {
  clearSessionValidationCache(token);
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

export { SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS };
