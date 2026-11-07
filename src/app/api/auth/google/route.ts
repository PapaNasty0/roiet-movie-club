import { NextResponse } from "next/server";
import { createUser, findUserByEmail, upsertGoogleUser } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function appOrigin(request: Request) {
  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appOrigin(request);

  if (!googleConfigured()) {
    // Local / unpublished fallback: demo Google sign-in
    const mode = url.searchParams.get("mode") || "demo";
    if (mode !== "demo") {
      return NextResponse.redirect(`${origin}/account?google=missing`);
    }
    let user = await findUserByEmail("google.demo@example.com");
    if (!user) {
      user = await createUser({
        email: "google.demo@example.com",
        name: "Google Demo",
        googleId: "demo-google-id",
      });
    } else {
      user = await upsertGoogleUser({
        email: "google.demo@example.com",
        name: "Google Demo",
        googleId: "demo-google-id",
      });
    }
    await setSessionCookie(await createSessionToken(user));
    return NextResponse.redirect(`${origin}/account?google=demo`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set("rmc_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
