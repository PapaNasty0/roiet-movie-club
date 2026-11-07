import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumComposer } from "@/components/ForumComposer";
import { SiteShell } from "@/components/SiteShell";
import { UserAvatar } from "@/components/UserAvatar";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin, getMovie, listForumPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  const { movieId } = await params;
  const movie = await getMovie(movieId);
  if (!movie) notFound();

  const [content, skin, posts, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    listForumPosts(movieId),
    requireUser(),
  ]);

  return (
    <SiteShell brand={content["home.brand"]} skin={skin} user={user}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href="/forum" className="text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)]">
          ← All threads
        </Link>
        <h1 className="font-display mt-4 text-4xl">{movie.title}</h1>
        <p className="mt-2 text-[color:var(--muted)]">
          Attendance chat and questions ·{" "}
          <Link href={`/movies/${movie.id}`} className="text-[color:var(--accent)] hover:underline">
            movie page
          </Link>
        </p>

        <div className="mt-10 space-y-6">
          {posts.length === 0 ? (
            <p className="text-[color:var(--muted)]">No posts yet. Start the thread.</p>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="border-t border-[color:var(--line)] pt-5">
                <header className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={p.author_name}
                      src={p.author_avatar || null}
                      size="sm"
                    />
                    <span className="text-[color:var(--accent-soft)]">
                      {p.author_name}
                    </span>
                  </div>
                  <time className="text-[color:var(--muted)]">
                    {new Date(p.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </header>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{p.body}</p>
              </article>
            ))
          )}
        </div>

        <div className="mt-10 border-t border-[color:var(--line)] pt-8">
          <ForumComposer movieId={movieId} signedIn={Boolean(user)} />
        </div>
      </div>
    </SiteShell>
  );
}
