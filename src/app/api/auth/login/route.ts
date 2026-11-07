import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  const result = await verifyPassword(parsed.data.email, parsed.data.password);
  if (result.reason === "unverified") {
    return NextResponse.json(
      {
        error:
          "Confirm your email before signing in. Check your inbox for the link.",
      },
      { status: 403 },
    );
  }
  if (!result.user) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }
  const token = await createSessionToken(result.user);
  await setSessionCookie(token);
  return NextResponse.json(
    { user: result.user },
    { headers: { "cache-control": "private, no-store" } },
  );
}
