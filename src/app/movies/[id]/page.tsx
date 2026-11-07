import { notFound } from "next/navigation";
import { EditableText } from "@/components/EditableText";
import { SiteShell } from "@/components/SiteShell";
import { RsvpPanel } from "@/components/RsvpPanel";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import {
  getMovie,
  getRsvpAggregates,
  getSkinById,
  getUserRsvp,
  listRsvpAttendees,
} from "@/lib/data";
import { formatLength, formatShowtime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movie = await getMovie(id);
  if (!movie || !movie.published) notFound();

  const [content, skin, user, aggregates, attendees] = await Promise.all([
    getContentMap(),
    getSkinById(movie.skin_id),
    requireUser(),
    getRsvpAggregates(movie.id),
    listRsvpAttendees(movie.id),
  ]);
  const myRsvp = user ? await getUserRsvp(movie.id, user.id) : null;
  const isAdmin = Boolean(user?.is_admin);

  return (
    <SiteShell
      brand={content["home.brand"]}
      footerTagline={content["footer.tagline"]}
      skin={skin}
      user={user}
    >
      <div className="hero-plane min-h-[52vh]">
        <div
          className="hero-media"
          style={{
            backgroundImage: `url(${
              movie.poster_url ||
              "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1800&q=80"
            })`,
          }}
        />
        <div className="hero-veil" style={{ background: skin.hero_overlay }} />
        <div className="hero-copy">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">
            {movie.cinema}
          </p>
          <h1 className="font-display mt-3 text-4xl sm:text-6xl">{movie.title}</h1>
          <p className="mt-3 text-[color:var(--muted)]">
            {formatShowtime(movie.showtime_start)}
            {movie.showtime_end ? ` – ${formatShowtime(movie.showtime_end)}` : ""} ·{" "}
            {formatLength(movie.length_minutes)} · {movie.rating} · {movie.genre}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[1.2fr_0.8fr] sm:px-6">
        <div className="space-y-8">
          {movie.youtube_trailer_id ? (
            <div className="aspect-video overflow-hidden rounded-sm bg-black/50">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${movie.youtube_trailer_id}`}
                title={`${movie.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          <section>
            <EditableText
              contentKey="movie.synopsis_heading"
              value={content["movie.synopsis_heading"] || "Synopsis"}
              isAdmin={isAdmin}
              as="h2"
              className="font-display text-2xl"
            />
            <p className="mt-3 leading-relaxed text-[color:var(--muted)]">{movie.synopsis}</p>
          </section>
          {movie.reviews_summary ? (
            <section>
              <EditableText
                contentKey="movie.reviews_heading"
                value={content["movie.reviews_heading"] || "Reviews summary"}
                isAdmin={isAdmin}
                as="h2"
                className="font-display text-2xl"
              />
              <p className="mt-3 leading-relaxed text-[color:var(--muted)]">
                {movie.reviews_summary}
              </p>
            </section>
          ) : null}
          <EditableText
            contentKey="movie.forum_link"
            value={content["movie.forum_link"] || "Open this movie’s forum thread →"}
            isAdmin={isAdmin}
            href={`/forum/${movie.id}`}
            linkClassName="inline-flex text-[color:var(--accent)] hover:underline"
            inline
          />
        </div>
        <RsvpPanel
          movieId={movie.id}
          signedIn={Boolean(user)}
          initial={myRsvp}
          aggregates={aggregates}
          attendees={attendees}
        />
      </div>
    </SiteShell>
  );
}
