import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

const schema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(200).default(""),
  caption: z.string().max(500).default(""),
  image_url: z.string().url().max(1000),
  outing_date: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const photos = await sql(
    `select * from gallery_photos order by sort_order, outing_date desc nulls last`,
  );
  return NextResponse.json({ photos }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
  }
  const p = parsed.data;
  const rows = await sql(
    `insert into gallery_photos (title, caption, image_url, outing_date, sort_order)
     values ($1,$2,$3,$4,$5) returning *`,
    [p.title, p.caption, p.image_url, p.outing_date || null, p.sort_order],
  );
  return NextResponse.json(
    { photo: rows[0] },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
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
  await sql(`delete from gallery_photos where id = $1`, [id]);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
}
