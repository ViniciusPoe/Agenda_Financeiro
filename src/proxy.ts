import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/maintenance", "/api/auth"];
const SESSION_COOKIE_NAME = "session_token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "true") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Sistema em manutencao" },
        { status: 503 }
      );
    }

    if (pathname !== "/maintenance") {
      return NextResponse.redirect(new URL("/maintenance", request.url));
    }

    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { validateSession } = await import("@/lib/session");
  const isValid = await validateSession(token);

  if (!isValid) {
    const redirectResponse = NextResponse.redirect(
      new URL("/login", request.url)
    );
    redirectResponse.cookies.delete(SESSION_COOKIE_NAME);
    return redirectResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)",
  ],
};
