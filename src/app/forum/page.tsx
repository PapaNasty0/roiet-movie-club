import Link from "next/link";
import { EditableText } from "@/components/EditableText";
import { SiteShell } from "@/components/SiteShell";
import { requireUser } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { getActiveSkin, listForumMovies } from "@/lib/data";
import { formatShowtime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ForumIndexPage() {
  const [content, skin, movies, user] = await Promise.all([
    getContentMap(),
    getActiveSkin(),
    listForumMovies(),
    requireUser(),
  ]);
  const isAdmin = Boolean(user?.is_admin);

  return (
    <SiteShell
      brand={content["home.brand"]}
      footerTagline={content["footer.tagline"]}
      skin={skin}
      user={user}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <EditableText
          contentKey="forum.title"
          value={content["forum.title"] || "Discussion forum"}
          isAdmin={isAdmin}
          as="h1"
          className="font-display text-4xl sm:text-5xl"
        />
        <EditableText
          contentKey="forum.intro"
          value={content["forum.intro"] || ""}
          isAdmin={isAdmin}
          as="p"
          className="mt-3 max-w-2xl text-[color:var(--muted)]"
          multiline
        />
        <div className="mt-10 divide-y divide-[color:var(--line)] border-t border-[color:var(--line)]">
          {movies.map((m) => (
            <Link
              key={m.id}
              href={`/forum/${m.id}`}
              className="flex flex-wrap items-baseline justify-between gap-3 py-5 transition hover:text-[color:var(--accent-soft)]"
            >
              <div>
                <h2 className="font-display text-2xl">{m.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {formatShowtime(m.showtime_start)}
                </p>
              </div>
              <span className="text-sm text-[color:var(--muted)]">
                {m.post_count} {m.post_count === 1 ? "post" : "posts"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
