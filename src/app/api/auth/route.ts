import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  getSessionToken,
  clearFailedLoginAttempts,
  getLoginRateLimitStatus,
  getRateLimitKey,
  registerFailedLoginAttempt,
} from "@/lib/auth";
import {
  createSession,
  deleteSession,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_DAYS,
} from "@/lib/session";
import { loginSchema } from "@/lib/validators";

function isAbortError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    code === "ECONNRESET" ||
    code === "ABORT_ERR" ||
    message.toLowerCase().includes("aborted")
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const rateLimitKey = getRateLimitKey(clientIp, userAgent);
    const rateLimit = await getLoginRateLimitStatus(rateLimitKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Muitas tentativas de login. Tente novamente em instantes.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      await registerFailedLoginAttempt(rateLimitKey);
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }

    const valid = await verifyPassword(parsed.data.password);

    if (!valid) {
      await registerFailedLoginAttempt(rateLimitKey);
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    await clearFailedLoginAttempts(rateLimitKey);

    const token = await createSession();

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json(
        { error: "Requisicao interrompida" },
        { status: 499 }
      );
    }

    console.error("[POST /api/auth]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const token = await getSessionToken();
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    if (isAbortError(error)) {
      return NextResponse.json(
        { error: "Requisicao interrompida" },
        { status: 499 }
      );
    }

    console.error("[DELETE /api/auth]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
