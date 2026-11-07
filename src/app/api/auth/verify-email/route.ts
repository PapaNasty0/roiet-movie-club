import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/auth";
import { createSessionToken, setSessionCookie } from "@/lib/session";

function appOrigin(request: Request) {
  const env = process.env.APP_ORIGIN?.trim();
  if (env) return env.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const origin = appOrigin(request);
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.redirect(`${origin}/account?verify=missing`);
  }

  const user = await consumeEmailVerificationToken(token);
  if (!user) {
    return NextResponse.redirect(`${origin}/account?verify=invalid`);
  }

  await setSessionCookie(await createSessionToken(user));
  return NextResponse.redirect(`${origin}/account?verify=ok`);
}
