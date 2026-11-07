import { NextResponse } from "next/server";
import { requireUser, updateDisplayName } from "@/lib/auth";
import { sql } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json(
      { user: null },
      { headers: { "cache-control": "private, no-store" } },
    );
  }
  return NextResponse.json(
    { user },
    { headers: { "cache-control": "private, no-store" } },
  );
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
  if (
    parsed.data.notify_new_movies === undefined &&
    parsed.data.name === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let next = user;

  if (parsed.data.name !== undefined) {
    const updated = await updateDisplayName(user.id, parsed.data.name);
    if (!updated) {
      return NextResponse.json(
        { error: "Display name cannot be empty" },
        { status: 400 },
      );
    }
    next = updated;
  }

  if (parsed.data.notify_new_movies !== undefined) {
    const rows = await sql<{
      id: string;
      email: string;
      name: string;
      is_admin: boolean;
      notify_new_movies: boolean;
      email_verified: boolean;
    }>(
      `update users set notify_new_movies = $1 where id = $2
       returning id, email, name, is_admin, notify_new_movies, email_verified`,
      [parsed.data.notify_new_movies, next.id],
    );
    if (rows[0]) {
      next = {
        id: String(rows[0].id),
        email: String(rows[0].email),
        name: String(rows[0].name ?? ""),
        is_admin: Boolean(rows[0].is_admin),
        notify_new_movies: Boolean(rows[0].notify_new_movies),
        email_verified: Boolean(rows[0].email_verified),
      };
    }
  }

  return NextResponse.json(
    { user: next },
    { headers: { "cache-control": "private, no-store" } },
  );
}
