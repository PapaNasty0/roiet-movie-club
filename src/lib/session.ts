import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { User } from "./types";

const COOKIE = "rmc_session";

function secretKey() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    return new TextEncoder().encode(fromEnv);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  // Local only: ephemeral random secret (never a fixed public string).
  const g = globalThis as typeof globalThis & { __rmcSessionSecret?: Uint8Array };
  if (!g.__rmcSessionSecret) {
    g.__rmcSessionSecret = crypto.getRandomValues(new Uint8Array(32));
  }
  return g.__rmcSessionSecret;
}

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  is_admin: boolean;
};

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    is_admin: user.is_admin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      is_admin: Boolean(payload.is_admin),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export { COOKIE };
