import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function parseNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseSslConfig(raw: string | null) {
  if (!raw) return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;

  try {
    return JSON.parse(raw) as { rejectUnauthorized?: boolean };
  } catch {
    return undefined;
  }
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const parsedUrl = new URL(databaseUrl);
  const adapter = new PrismaMariaDb({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.replace(/^\//, ""),
    ssl: parseSslConfig(parsedUrl.searchParams.get("ssl")),
    connectionLimit: parseNumberEnv(
      "DATABASE_CONNECTION_LIMIT",
      process.env.NODE_ENV === "production" ? 3 : 5
    ),
    acquireTimeout: parseNumberEnv("DATABASE_POOL_ACQUIRE_TIMEOUT_MS", 15000),
    connectTimeout: parseNumberEnv("DATABASE_CONNECT_TIMEOUT_MS", 15000),
    idleTimeout: parseNumberEnv("DATABASE_POOL_IDLE_TIMEOUT_SECONDS", 30),
    minimumIdle: parseNonNegativeNumberEnv("DATABASE_POOL_MINIMUM_IDLE", 0),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;
