import { NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  requireUser,
  upsertGoogleUser,
} from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { publicOrigin } from "@/lib/request-origin";

function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

function oauthCookies(
  res: NextResponse,
  input: { state: string; origin: string; redirectUri: string; link: boolean },
) {
  const secure = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("rmc_oauth_state", input.state, base);
  res.cookies.set("rmc_oauth_origin", input.origin, base);
  // Exact redirect_uri used at authorize time — required for token exchange.
  res.cookies.set("rmc_oauth_redirect", input.redirectUri, base);
  if (input.link) {
    res.cookies.set("rmc_oauth_link", "1", base);
  } else {
    res.cookies.delete("rmc_oauth_link");
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const link = url.searchParams.get("link") === "1";

  if (link) {
    const sessionUser = await requireUser();
    if (!sessionUser) {
      return NextResponse.redirect(`${origin}/account?google=signin`);
    }
  }

  if (!googleConfigured()) {
    // Local-only demo Google — never available in production.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.redirect(`${origin}/account?google=missing`);
    }
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
  oauthCookies(res, { state, origin, redirectUri, link });
  return res;
}
