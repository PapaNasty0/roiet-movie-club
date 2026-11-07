import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration details" }, { status: 400 });
  }
  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const user = await createUser(parsed.data);
  const token = await createSessionToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ user }, { headers: { "cache-control": "private, no-store" } });
}
