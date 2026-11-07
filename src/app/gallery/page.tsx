import { SiteShell } from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin, listGallery } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const [content, skin, photos, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    listGallery(),
    requireUser(),
  ]);

  return (
    <SiteShell brand={content["home.brand"]} skin={skin} user={user}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">Outing gallery</h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          {content["gallery.intro"]}
        </p>
        <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {photos.map((p, i) => (
            <figure
              key={p.id}
              className="fade-up mb-5 break-inside-avoid"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_url}
                alt={p.title || "Outing photo"}
                className="w-full object-cover"
              />
              <figcaption className="mt-2 text-sm text-[color:var(--muted)]">
                <span className="text-[color:var(--ink)]">{p.title}</span>
                {p.caption ? ` — ${p.caption}` : ""}
                {p.outing_date ? ` · ${p.outing_date}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
