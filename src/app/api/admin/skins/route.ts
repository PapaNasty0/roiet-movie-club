import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const skins = await sql(`select * from skins order by is_default desc, name`);
  const active = await sql<{ value: string }>(
    `select value from site_settings where key = 'active_skin'`,
  );
  return NextResponse.json(
    { skins, active_skin: active[0]?.value ?? "roiet-default" },
    { headers: { "cache-control": "private, no-store" } },
  );
}

const schema = z.object({
  active_skin: z.string().min(1),
});

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid skin" }, { status: 400 });
  }
  const skin = await sql(`select id from skins where id = $1`, [parsed.data.active_skin]);
  if (!skin[0]) {
    return NextResponse.json({ error: "Skin not found" }, { status: 404 });
  }
  await sql(
    `insert into site_settings (key, value) values ('active_skin', $1)
     on conflict (key) do update set value = excluded.value`,
    [parsed.data.active_skin],
  );
  return NextResponse.json(
    { active_skin: parsed.data.active_skin },
    { headers: { "cache-control": "private, no-store" } },
  );
}
