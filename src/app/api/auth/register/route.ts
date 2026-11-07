import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createUser,
  findUserByEmail,
  resetUnverifiedPasswordUser,
  startEmailVerification,
} from "@/lib/auth";

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

  const user = existing
    ? await resetUnverifiedPasswordUser({
        userId: existing.id,
        password: parsed.data.password,
        name: parsed.data.name,
      })
    : await createUser({
        ...parsed.data,
        emailVerified: false,
      });

  const mail = await startEmailVerification({
    user,
    origin: appOrigin(request),
  });

  return NextResponse.json(
    {
      pendingVerification: true,
      message:
        "Check your email for a confirmation link before signing in.",
      ...(mail.verifyUrl ? { verifyUrl: mail.verifyUrl } : {}),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
