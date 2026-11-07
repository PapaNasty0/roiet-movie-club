import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { contentLabelFor, getAllContent } from "@/lib/content";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  return NextResponse.json(
    { content: await getAllContent() },
    { headers: { "cache-control": "private, no-store" } },
  );
}

const schema = z.object({
  items: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
    }),
  ),
});

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content payload" }, { status: 400 });
  }
  for (const item of parsed.data.items) {
    await sql(
      `insert into site_content (key, label, value, updated_at)
       values ($1, $2, $3, now())
       on conflict (key) do update set
         value = excluded.value,
         label = case
           when site_content.label = '' or site_content.label = site_content.key
             then excluded.label
           else site_content.label
         end,
         updated_at = now()`,
      [item.key, contentLabelFor(item.key), item.value],
    );
  }
  return NextResponse.json(
    { content: await getAllContent() },
    { headers: { "cache-control": "private, no-store" } },
  );
}
