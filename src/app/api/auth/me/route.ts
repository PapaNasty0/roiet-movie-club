import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ user: null }, { headers: { "cache-control": "private, no-store" } });
  }
  return NextResponse.json({ user }, { headers: { "cache-control": "private, no-store" } });
}

const patchSchema = z.object({
  notify_new_movies: z.boolean().optional(),
  name: z.string().min(1).max(80).optional(),
});

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }
  const rows = await sql(
    `update users set
       notify_new_movies = coalesce($1, notify_new_movies),
       name = coalesce($2, name)
     where id = $3
     returning id, email, name, is_admin, notify_new_movies`,
    [
      parsed.data.notify_new_movies ?? null,
      parsed.data.name ?? null,
      user.id,
    ],
  );
  return NextResponse.json(
    { user: rows[0] },
    { headers: { "cache-control": "private, no-store" } },
  );
}
