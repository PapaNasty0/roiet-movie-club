import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminPasswordBootstrapAllowed,
  createUser,
  findUserByEmail,
  resetUnverifiedPasswordUser,
  startEmailVerification,
} from "@/lib/auth";
import { resendConfigured } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80),
});

function appOrigin(request: Request) {
  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details" },
      { status: 400 },
    );
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing?.email_verified) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  // Always create unverified password accounts. When Resend is configured,
  // they must click the email link. When Resend is unset, only ADMIN_EMAIL
  // can finish via password bootstrap on sign-in.
  const user = existing
    ? await resetUnverifiedPasswordUser({
        userId: existing.id,
        password: parsed.data.password,
        name: parsed.data.name,
        emailVerified: false,
      })
    : await createUser({
        ...parsed.data,
        emailVerified: false,
      });

  const mail = await startEmailVerification({
    user,
    origin: appOrigin(request),
  });

  let message =
    "Check your email for a confirmation link before signing in.";
  if (mail.stubbed && !mail.verifyUrl) {
    message = adminPasswordBootstrapAllowed(user.email)
      ? "Email delivery is not configured. Sign in with this password to finish admin setup."
      : "Email confirmation is required, but delivery is not configured yet. Ask the site admin to enable email (Resend) or Google sign-in.";
  } else if (!resendConfigured() && mail.verifyUrl) {
    message =
      "Confirm your email to finish. Open the local verification link shown below.";
  }

  return NextResponse.json(
    {
      pendingVerification: true,
      message,
      ...(mail.verifyUrl ? { verifyUrl: mail.verifyUrl } : {}),
      ...(mail.stubbed &&
      !mail.verifyUrl &&
      adminPasswordBootstrapAllowed(user.email)
        ? { adminBootstrap: true }
        : {}),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
