import { sql } from "./db";
import type { SiteContent } from "./types";

export const CONTENT_DEFAULTS: SiteContent[] = [
  {
    key: "home.brand",
    label: "Brand name",
    value: "RoiEt English Movie Club",
  },
  {
    key: "home.tagline",
    label: "Home tagline",
    value: "English screenings at Robinson Roi Et — come for the film, stay for the company.",
  },
  {
    key: "home.cta_primary",
    label: "Primary CTA label",
    value: "See upcoming movies",
  },
  {
    key: "home.cta_secondary",
    label: "Secondary CTA label",
    value: "Join the club",
  },
  {
    key: "home.about_heading",
    label: "Home about heading",
    value: "Why we meet",
  },
  {
    key: "home.about",
    label: "About blurb",
    value:
      "A friendly meetup for foreigners, students, and teachers in RoiEt. We watch English-language films at Major Cineplex, RSVP so nobody sits alone, and share outing photos afterward.",
  },
  {
    key: "home.next_label",
    label: "Home next-up label",
    value: "Coming soon",
  },
  {
    key: "home.next_cta",
    label: "Home next-up CTA",
    value: "Movie details & RSVP",
  },
  {
    key: "movies.title",
    label: "Movies page title",
    value: "Upcoming English movies",
  },
  {
    key: "movies.intro",
    label: "Movies page intro",
    value:
      "Admin-managed listings for Robinson Roi Et / Major Cineplex. Cinema scraping is not wired in v1 — titles are entered by Brian.",
  },
  {
    key: "movies.empty",
    label: "Movies empty state",
    value: "No published movies yet.",
  },
  {
    key: "movies.detail_cta",
    label: "Movies list detail CTA",
    value: "Details, trailer & RSVP →",
  },
  {
    key: "movie.synopsis_heading",
    label: "Movie synopsis heading",
    value: "Synopsis",
  },
  {
    key: "movie.reviews_heading",
    label: "Movie reviews heading",
    value: "Reviews summary",
  },
  {
    key: "movie.forum_link",
    label: "Movie forum link label",
    value: "Open this movie’s forum thread →",
  },
  {
    key: "gallery.title",
    label: "Gallery page title",
    value: "Outing gallery",
  },
  {
    key: "gallery.intro",
    label: "Gallery intro",
    value: "Snapshots from club outings — lobby meetups, post-film chats, and the occasional ice cream.",
  },
  {
    key: "forum.title",
    label: "Forum page title",
    value: "Discussion forum",
  },
  {
    key: "forum.intro",
    label: "Forum intro",
    value: "Talk about showtimes, carpools, kids’ films, and who’s going. Sign in to post.",
  },
  {
    key: "forum.thread_blurb",
    label: "Forum thread blurb",
    value: "Attendance chat and questions",
  },
  {
    key: "account.join_title",
    label: "Account signed-out title",
    value: "Join the club",
  },
  {
    key: "account.join_intro",
    label: "Account signed-out intro",
    value:
      "Email + password, or Google. Same email keeps one account. RSVPs and forum posts require an account.",
  },
  {
    key: "account.join_intro_password",
    label: "Account signed-out intro (no Google)",
    value: "Email + password. RSVPs and forum posts require an account.",
  },
  {
    key: "footer.tagline",
    label: "Footer tagline",
    value: "English-language screenings for foreigners, students, and teachers in RoiEt.",
  },
];

const DEFAULT_BY_KEY = Object.fromEntries(
  CONTENT_DEFAULTS.map((d) => [d.key, d]),
) as Record<string, SiteContent>;

export function contentLabelFor(key: string): string {
  return DEFAULT_BY_KEY[key]?.label || key;
}

export async function getContentMap(): Promise<Record<string, string>> {
  const rows = await sql<SiteContent>(
    `select key, label, value from site_content order by key`,
  );
  const map: Record<string, string> = {};
  for (const d of CONTENT_DEFAULTS) map[d.key] = d.value;
  for (const r of rows) map[r.key] = r.value;
  return map;
}

/** Defaults merged with DB rows so new keys appear in admin without a reseed. */
export async function getAllContent(): Promise<SiteContent[]> {
  const rows = await sql<SiteContent>(
    `select key, label, value from site_content order by key`,
  );
  const byKey = new Map<string, SiteContent>();
  for (const d of CONTENT_DEFAULTS) byKey.set(d.key, { ...d });
  for (const r of rows) {
    const base = byKey.get(r.key);
    byKey.set(r.key, {
      key: r.key,
      label: r.label || base?.label || r.key,
      value: r.value,
    });
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}
