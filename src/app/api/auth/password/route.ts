import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, setUserPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(8).max(100),
});

/** Add or change password on the signed-in account (same email). */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const updated = await setUserPassword(user.id, parsed.data.password);
  if (!updated) {
    return NextResponse.json(
      { error: "Could not save password" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      user: updated,
      message: user.has_password
        ? "Password updated. You can sign in with email and this password."
        : "Password saved. You can sign in with email and this password, or Google.",
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
