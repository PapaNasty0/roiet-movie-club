import { createNeonAuth } from "@neon/auth/next/server";

/**
 * Neon Auth (Managed Better Auth) — optional alongside the existing
 * email/password + Google cookie-session auth. Do not enable Neon middleware
 * globally; that would change the current public-page model.
 */
const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim() ?? "";
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";

export function neonAuthConfigured(): boolean {
  return baseUrl.length > 0 && cookieSecret.length >= 32;
}

export const neonAuth = neonAuthConfigured()
  ? createNeonAuth({
      baseUrl,
      cookies: { secret: cookieSecret },
    })
  : null;
