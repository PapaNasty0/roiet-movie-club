import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { listForumPosts } from "@/lib/data";
import { sql } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  const { movieId } = await context.params;
  const posts = await listForumPosts(movieId);
  return NextResponse.json({ posts });
}

const schema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ movieId: string }> },
) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { movieId } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Write a short message" }, { status: 400 });
  }
  const movie = await sql(`select id from movies where id = $1`, [movieId]);
  if (!movie[0]) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  const rows = await sql(
    `insert into forum_posts (movie_id, user_id, body)
     values ($1, $2, $3)
     returning id, movie_id, user_id, body, created_at`,
    [movieId, user.id, parsed.data.body],
  );
  return NextResponse.json(
    {
      post: {
        ...rows[0],
        author_name: user.name,
        author_avatar: user.avatar_url || "",
      },
    },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
}
