import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS ?? "7");
const SESSION_COOKIE_NAME = "session_token";
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? process.env.AUTH_PASSWORD ?? "";

type SessionPayload = {
  exp: number;
  sid: string;
};

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    return JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");
}

export async function createSession(): Promise<string> {
  const expiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const encodedPayload = encodePayload({
    exp: expiresAt,
    sid: randomUUID(),
  });

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export async function validateSession(token: string): Promise<boolean> {
  if (!SESSION_SECRET) {
    return false;
  }

  const [encodedPayload, providedSignature, ...rest] = token.split(".");
  if (!encodedPayload || !providedSignature || rest.length > 0) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(expectedBuffer, providedBuffer)) {
    return false;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  return payload.exp > Date.now();
}

export async function deleteSession(token: string): Promise<void> {
  void token;
}

export { SESSION_COOKIE_NAME, SESSION_EXPIRY_DAYS };
