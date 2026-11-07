import { sql } from "./db";
import { DEFAULT_SKIN } from "./skins";
import type {
  ForumPost,
  GalleryPhoto,
  Movie,
  Rsvp,
  RsvpAggregate,
  Skin,
  User,
} from "./types";

function parseSkin(row: Record<string, unknown> | undefined): Skin | null {
  if (!row) return null;
  let css = row.css_vars;
  if (typeof css === "string") {
    try {
      css = JSON.parse(css);
    } catch {
      css = {};
    }
  }
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ""),
    css_vars: (css as Record<string, string>) || {},
    hero_overlay: String(row.hero_overlay ?? ""),
    is_default: Boolean(row.is_default),
  };
}

export async function getActiveSkin(): Promise<Skin> {
  const setting = await sql<{ value: string }>(
    `select value from site_settings where key = 'active_skin'`,
  );
  const id = setting[0]?.value || DEFAULT_SKIN.id;
  const rows = await sql<Record<string, unknown>>(
    `select * from skins where id = $1`,
    [id],
  );
  return parseSkin(rows[0]) || DEFAULT_SKIN;
}

export async function getSkinById(id: string | null | undefined): Promise<Skin> {
  if (!id) return getActiveSkin();
  const rows = await sql<Record<string, unknown>>(
    `select * from skins where id = $1`,
    [id],
  );
  return parseSkin(rows[0]) || (await getActiveSkin());
}

export async function listUpcomingMovies(): Promise<Movie[]> {
  return sql<Movie>(
    `select * from movies
     where published = true
     order by showtime_start nulls last, created_at desc`,
  );
}

export async function getMovie(id: string): Promise<Movie | null> {
  const rows = await sql<Movie>(`select * from movies where id = $1`, [id]);
  return rows[0] ?? null;
}

export async function getRsvpAggregates(movieId: string): Promise<RsvpAggregate[]> {
  return sql<RsvpAggregate>(
    `select status,
            count(*)::int as parties,
            coalesce(sum(adults + children), 0)::int as people
     from rsvps where movie_id = $1
     group by status`,
    [movieId],
  );
}

export async function getUserRsvp(
  movieId: string,
  userId: string,
): Promise<Rsvp | null> {
  const rows = await sql<Rsvp>(
    `select id, movie_id, user_id, status, adults, children
     from rsvps where movie_id = $1 and user_id = $2`,
    [movieId, userId],
  );
  return rows[0] ?? null;
}

export async function listForumMovies(): Promise<
  (Movie & { post_count: number })[]
> {
  return sql(
    `select m.*, coalesce(c.n, 0)::int as post_count
     from movies m
     left join (
       select movie_id, count(*)::int as n from forum_posts group by movie_id
     ) c on c.movie_id = m.id
     where m.published = true
     order by m.showtime_start nulls last`,
  );
}

export async function listForumPosts(movieId: string): Promise<ForumPost[]> {
  return sql<ForumPost>(
    `select p.id, p.movie_id, p.user_id, p.body, p.created_at, u.name as author_name
     from forum_posts p
     join users u on u.id = p.user_id
     where p.movie_id = $1
     order by p.created_at asc`,
    [movieId],
  );
}

export async function listGallery(): Promise<GalleryPhoto[]> {
  return sql<GalleryPhoto>(
    `select * from gallery_photos order by sort_order, outing_date desc nulls last`,
  );
}

export async function listSkins(): Promise<Skin[]> {
  const rows = await sql<Record<string, unknown>>(
    `select * from skins order by is_default desc, name`,
  );
  return rows.map((r) => parseSkin(r)!);
}

export type { User };
