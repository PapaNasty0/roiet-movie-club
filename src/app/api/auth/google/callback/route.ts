import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  linkGoogleToUser,
  requireUser,
  upsertGoogleUser,
} from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

function oauthOrigin(request: Request, stored?: string | null) {
  if (stored?.startsWith("http")) return stored.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("rmc_oauth_state")?.value;
  const storedOrigin = jar.get("rmc_oauth_origin")?.value;
  const linking = jar.get("rmc_oauth_link")?.value === "1";
  jar.delete("rmc_oauth_state");
  jar.delete("rmc_oauth_origin");
  jar.delete("rmc_oauth_link");

  const origin = oauthOrigin(request, storedOrigin);

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/account?google=missing`);
  }

  // Must match the redirect_uri used when starting OAuth.
  const redirectUri = `${origin}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    },
  );
  if (!profileRes.ok) {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }
  const profile = (await profileRes.json()) as {
    id?: string;
    email?: string;
    name?: string;
    verified_email?: boolean;
  };
  if (!profile.email || !profile.id) {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }
  if (profile.verified_email === false) {
    return NextResponse.redirect(`${origin}/account?google=unverified`);
  }

  if (linking) {
    const sessionUser = await requireUser();
    if (!sessionUser) {
      return NextResponse.redirect(`${origin}/account?google=signin`);
    }
    const linked = await linkGoogleToUser({
      userId: sessionUser.id,
      email: profile.email,
      googleId: profile.id,
      name: profile.name,
    });
    if (!linked.ok) {
      const q =
        linked.reason === "mismatch"
          ? "link=mismatch"
          : linked.reason === "conflict"
            ? "link=conflict"
            : "google=error";
      return NextResponse.redirect(`${origin}/account?${q}`);
    }
    await setSessionCookie(await createSessionToken(linked.user));
    return NextResponse.redirect(`${origin}/account?link=ok`);
  }

  // Normal sign-in: same email → same account (links Google automatically).
  const user = await upsertGoogleUser({
    email: profile.email,
    name: profile.name || profile.email.split("@")[0],
    googleId: profile.id,
  });
  await setSessionCookie(await createSessionToken(user));
  return NextResponse.redirect(`${origin}/account`);
}
