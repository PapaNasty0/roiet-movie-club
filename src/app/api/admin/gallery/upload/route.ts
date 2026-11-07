import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { storageConfigured, uploadGalleryObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  if (!storageConfigured()) {
    return NextResponse.json(
      { error: "Object Storage is not configured" },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").slice(0, 200);
  const caption = String(form.get("caption") ?? "").slice(0, 500);
  const outingRaw = String(form.get("outing_date") ?? "").trim();
  const outing_date = outingRaw || null;
  const sort_order = Number(form.get("sort_order") ?? 0) || 0;

  const body = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadGalleryObject({
    body,
    contentType: file.type,
    filename: file.name,
  });

  const rows = await sql(
    `insert into gallery_photos (title, caption, image_url, outing_date, sort_order)
     values ($1,$2,$3,$4,$5) returning *`,
    [title, caption, uploaded.ref, outing_date, sort_order],
  );

  return NextResponse.json(
    { photo: rows[0], storage_key: uploaded.key },
    { status: 201, headers: { "cache-control": "private, no-store" } },
  );
}
