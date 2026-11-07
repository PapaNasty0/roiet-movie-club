import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin, listUpcomingMovies } from "@/lib/data";
import { formatLength, formatShowtime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const [content, skin, movies, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    listUpcomingMovies(),
    requireUser(),
  ]);

  return (
    <SiteShell brand={content["home.brand"]} skin={skin} user={user}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl sm:text-5xl">Upcoming English movies</h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          Admin-managed listings for Robinson Roi Et / Major Cineplex. Cinema scraping is not
          wired in v1 — titles are entered by Brian.
        </p>
        <div className="mt-10 space-y-8">
          {movies.length === 0 ? (
            <p className="text-[color:var(--muted)]">No published movies yet.</p>
          ) : (
            movies.map((m, i) => (
              <article
                key={m.id}
                className="fade-up grid gap-6 border-t border-[color:var(--line)] pt-8 md:grid-cols-[220px_1fr]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="aspect-[2/3] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${
                      m.poster_url ||
                      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80"
                    })`,
                  }}
                />
                <div>
                  <h2 className="font-display text-3xl">
                    <Link href={`/movies/${m.id}`} className="hover:text-[color:var(--accent-soft)]">
                      {m.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">
                    {formatShowtime(m.showtime_start)} · {formatLength(m.length_minutes)} ·{" "}
                    {m.rating || "Unrated"} · {m.genre}
                  </p>
                  <p className="mt-4 max-w-2xl text-[color:var(--muted)]">{m.synopsis}</p>
                  <Link
                    href={`/movies/${m.id}`}
                    className="mt-5 inline-flex text-[color:var(--accent)] hover:underline"
                  >
                    Details, trailer & RSVP →
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </SiteShell>
  );
}
