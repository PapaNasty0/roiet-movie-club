import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listRsvpAttendees } from "@/lib/data";
import { sql } from "@/lib/db";

const schema = z.object({
  status: z.enum(["might_go", "probably_go", "booked"]),
  adults: z.number().int().min(0).max(20),
  children: z.number().int().min(0).max(20),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RSVP" }, { status: 400 });
  }
  if (parsed.data.adults + parsed.data.children < 1) {
    return NextResponse.json(
      { error: "Add at least one person" },
      { status: 400 },
    );
  }

  const movie = await sql(
    `select id from movies where id = $1 and published = true`,
    [id],
  );
  if (!movie[0]) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }

  const rows = await sql(
    `insert into rsvps (movie_id, user_id, status, adults, children, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (movie_id, user_id) do update set
       status = excluded.status,
       adults = excluded.adults,
       children = excluded.children,
       updated_at = now()
     returning id, movie_id, user_id, status, adults, children`,
    [
      id,
      user.id,
      parsed.data.status,
      parsed.data.adults,
      parsed.data.children,
    ],
  );

  const aggregates = await sql(
    `select status,
            count(*)::int as parties,
            coalesce(sum(adults + children), 0)::int as people
     from rsvps where movie_id = $1
     group by status`,
    [id],
  );
  const attendees = await listRsvpAttendees(id);

  return NextResponse.json(
    { rsvp: rows[0], aggregates, attendees },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await context.params;
  await sql(`delete from rsvps where movie_id = $1 and user_id = $2`, [
    id,
    user.id,
  ]);
  const attendees = await listRsvpAttendees(id);
  return NextResponse.json(
    { ok: true, attendees },
    { headers: { "cache-control": "private, no-store" } },
  );
}
