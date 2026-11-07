import { EditableText } from "@/components/EditableText";
import { SiteShell } from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin, listUpcomingMovies } from "@/lib/data";
import { formatLength, formatShowtime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, skin, movies, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    listUpcomingMovies(),
    requireUser(),
  ]);
  const next = movies[0];
  const brand = content["home.brand"] || "RoiEt English Movie Club";
  const isAdmin = Boolean(user?.is_admin);

  return (
    <SiteShell brand={brand} footerTagline={content["footer.tagline"]} skin={skin} user={user}>
      <section className="hero-plane">
        <div
          className="hero-media"
          style={{
            backgroundImage: `url(${
              next?.poster_url ||
              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80"
            })`,
          }}
        />
        <div
          className="hero-veil"
          style={{ background: skin.hero_overlay }}
        />
        <div className="hero-copy">
          <EditableText
            contentKey="home.brand"
            value={brand}
            isAdmin={isAdmin}
            as="p"
            className="font-display text-4xl leading-none text-[color:var(--accent-soft)] sm:text-6xl md:text-7xl"
          />
          <EditableText
            contentKey="home.tagline"
            value={content["home.tagline"] || ""}
            isAdmin={isAdmin}
            as="h1"
            className="mt-5 max-w-2xl text-xl text-[color:var(--ink)] sm:text-2xl"
            multiline
          />
          <p className="mt-3 max-w-xl text-[color:var(--muted)]">
            {next
              ? `Next up: ${next.title} · ${formatShowtime(next.showtime_start)}`
              : "Upcoming English titles are posted by the club admin."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <EditableText
              contentKey="home.cta_primary"
              value={content["home.cta_primary"] || "See upcoming movies"}
              isAdmin={isAdmin}
              href="/movies"
              linkClassName="btn-primary"
              inline
            />
            <EditableText
              contentKey="home.cta_secondary"
              value={content["home.cta_secondary"] || "Join the club"}
              isAdmin={isAdmin}
              href="/account"
              linkClassName="btn-ghost"
              inline
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="fade-up max-w-2xl">
          <EditableText
            contentKey="home.about_heading"
            value={content["home.about_heading"] || "Why we meet"}
            isAdmin={isAdmin}
            as="h2"
            className="font-display text-3xl"
          />
          <EditableText
            contentKey="home.about"
            value={content["home.about"] || ""}
            isAdmin={isAdmin}
            as="p"
            className="mt-4 text-lg leading-relaxed text-[color:var(--muted)]"
            multiline
          />
        </div>

        {next ? (
          <div className="fade-up-delay mt-14 grid gap-8 border-t border-[color:var(--line)] pt-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <EditableText
                contentKey="home.next_label"
                value={content["home.next_label"] || "Coming soon"}
                isAdmin={isAdmin}
                as="p"
                className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted)]"
              />
              <h3 className="font-display mt-3 text-4xl">{next.title}</h3>
              <p className="mt-4 max-w-xl text-[color:var(--muted)]">{next.synopsis}</p>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[color:var(--muted)]">When</dt>
                  <dd>{formatShowtime(next.showtime_start)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Length</dt>
                  <dd>{formatLength(next.length_minutes)}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Rating</dt>
                  <dd>{next.rating || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[color:var(--muted)]">Genre</dt>
                  <dd>{next.genre || "—"}</dd>
                </div>
              </dl>
              <div className="mt-8">
                <EditableText
                  contentKey="home.next_cta"
                  value={content["home.next_cta"] || "Movie details & RSVP"}
                  isAdmin={isAdmin}
                  href={`/movies/${next.id}`}
                  linkClassName="btn-primary inline-flex"
                  inline
                />
              </div>
            </div>
            {next.youtube_trailer_id ? (
              <div className="aspect-video overflow-hidden rounded-sm bg-black/40">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${next.youtube_trailer_id}`}
                  title={`${next.title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}
