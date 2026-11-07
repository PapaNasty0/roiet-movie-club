import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { notifyNewMovieSubscribers } from "@/lib/email";

const movieSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  synopsis: z.string().max(5000).default(""),
  genre: z.string().max(120).default(""),
  rating: z.string().max(40).default(""),
  length_minutes: z.number().int().min(0).max(600).default(0),
  showtime_start: z.string().nullable().optional(),
  showtime_end: z.string().nullable().optional(),
  youtube_trailer_id: z.string().max(40).default(""),
  reviews_summary: z.string().max(2000).default(""),
  poster_url: z.string().max(1000).default(""),
  cinema: z.string().max(200).default("Robinson Roi Et / Major Cineplex"),
  skin_id: z.string().nullable().optional(),
  published: z.boolean().default(true),
  notify: z.boolean().optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const movies = await sql(`select * from movies order by showtime_start nulls last, created_at desc`);
  return NextResponse.json({ movies }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const parsed = movieSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid movie" }, { status: 400 });
  }
  const m = parsed.data;
  const rows = await sql(
    `insert into movies (
      title, synopsis, genre, rating, length_minutes, showtime_start, showtime_end,
      youtube_trailer_id, reviews_summary, poster_url, cinema, skin_id, published, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
    returning *`,
    [
      m.title,
      m.synopsis,
      m.genre,
      m.rating,
      m.length_minutes,
      m.showtime_start || null,
      m.showtime_end || null,
      m.youtube_trailer_id,
      m.reviews_summary,
      m.poster_url,
      m.cinema,
      m.skin_id || null,
      m.published,
    ],
  );

  if (m.notify && m.published) {
    const recipients = await sql<{ email: string; name: string }>(
      `select email, name from users where notify_new_movies = true`,
    );
    await notifyNewMovieSubscribers({
      title: m.title,
      showtime: m.showtime_start,
      recipients,
    });
  }

  return NextResponse.json(
    { movie: rows[0] },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const parsed = movieSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !parsed.data.id) {
    return NextResponse.json({ error: "Invalid movie update" }, { status: 400 });
  }
  const m = parsed.data;
  const rows = await sql(
    `update movies set
      title=$1, synopsis=$2, genre=$3, rating=$4, length_minutes=$5,
      showtime_start=$6, showtime_end=$7, youtube_trailer_id=$8, reviews_summary=$9,
      poster_url=$10, cinema=$11, skin_id=$12, published=$13, updated_at=now()
     where id=$14 returning *`,
    [
      m.title,
      m.synopsis,
      m.genre,
      m.rating,
      m.length_minutes,
      m.showtime_start || null,
      m.showtime_end || null,
      m.youtube_trailer_id,
      m.reviews_summary,
      m.poster_url,
      m.cinema,
      m.skin_id || null,
      m.published,
      m.id,
    ],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ movie: rows[0] }, { headers: { "cache-control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await sql(`delete from movies where id = $1`, [id]);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
