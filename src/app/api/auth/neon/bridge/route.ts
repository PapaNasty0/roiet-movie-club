import { NextResponse } from "next/server";
import { upsertGoogleUser } from "@/lib/auth";
import { neonAuth, neonAuthConfigured } from "@/lib/neon-auth-server";
import { createSessionToken, setSessionCookie } from "@/lib/session";

/**
 * After Neon Auth sign-in, copy the Neon user into the app `users` table and
 * set the existing rmc_session cookie so RSVP/forum/admin keep working.
 */
export async function POST() {
  if (!neonAuthConfigured() || !neonAuth) {
    return NextResponse.json(
      { error: "Neon Auth is not configured" },
      { status: 503 },
    );
  }

  const { data: session, error } = await neonAuth.getSession();
  if (error || !session?.user?.email) {
    return NextResponse.json(
      { error: "No Neon Auth session" },
      { status: 401 },
    );
  }

  const email = String(session.user.email).toLowerCase();
  const name =
    (typeof session.user.name === "string" && session.user.name) ||
    email.split("@")[0];
  const neonId = String(session.user.id ?? `neon:${email}`);

  // Reuse google_id column as an external IdP key for Neon Auth users.
  const user = await upsertGoogleUser({
    email,
    name,
    googleId: `neon:${neonId}`,
  });

  const token = await createSessionToken(user);
  await setSessionCookie(token);

  return NextResponse.json(
    { user },
    { headers: { "cache-control": "private, no-store" } },
  );
}
