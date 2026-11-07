import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { SiteShell } from "@/components/SiteShell";
import { requireAdmin } from "@/lib/auth";
import { getAllContent, getContentMap } from "@/lib/content";
import { getActiveSkin, listGallery, listSkins } from "@/lib/data";
import { sql } from "@/lib/db";
import type { Movie } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/account");

  const [contentMap, content, movies, photos, skins, skin] = await Promise.all([
    getContentMap(),
    getAllContent(),
    sql<Movie>(`select * from movies order by showtime_start nulls last, created_at desc`),
    listGallery(),
    listSkins(),
    getActiveSkin(),
  ]);

  return (
    <SiteShell brand={contentMap["home.brand"]} skin={skin} user={admin}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">Admin</h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          Manage movies, gallery photos, skins, and editable site text. Admin is assigned when
          an account email matches{" "}
          <code className="text-[color:var(--accent-soft)]">ADMIN_EMAIL</code> (set via env;
          default bjleigh@gmail.com) on verified signup or Google sign-in.
        </p>
        <div className="mt-10">
          <AdminPanel
            content={content}
            movies={movies}
            photos={photos}
            skins={skins}
            activeSkin={skin.id}
          />
        </div>
      </div>
    </SiteShell>
  );
}
