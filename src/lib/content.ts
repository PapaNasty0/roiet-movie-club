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
    key: "home.about",
    label: "About blurb",
    value:
      "A friendly meetup for foreigners, students, and teachers in RoiEt. We watch English-language films at Major Cineplex, RSVP so nobody sits alone, and share outing photos afterward.",
  },
  {
    key: "forum.intro",
    label: "Forum intro",
    value: "Talk about showtimes, carpools, kids’ films, and who’s going. Sign in to post.",
  },
  {
    key: "gallery.intro",
    label: "Gallery intro",
    value: "Snapshots from club outings — lobby meetups, post-film chats, and the occasional ice cream.",
  },
];

export async function getContentMap(): Promise<Record<string, string>> {
  const rows = await sql<SiteContent>(
    `select key, label, value from site_content order by key`,
  );
  const map: Record<string, string> = {};
  for (const d of CONTENT_DEFAULTS) map[d.key] = d.value;
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getAllContent(): Promise<SiteContent[]> {
  const rows = await sql<SiteContent>(
    `select key, label, value from site_content order by key`,
  );
  if (rows.length === 0) return CONTENT_DEFAULTS;
  return rows;
}
