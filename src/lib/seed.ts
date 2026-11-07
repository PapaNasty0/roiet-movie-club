import { queryRaw } from "./db";
import { CONTENT_DEFAULTS } from "./content";
import { DEFAULT_SKIN, NOIR_SKIN } from "./skins";
import { ADMIN_EMAIL } from "./constants";
import bcrypt from "bcryptjs";

const g = globalThis as typeof globalThis & { __rmcSeeded?: boolean };

export async function seedIfEmpty(): Promise<void> {
  if (g.__rmcSeeded) return;
  const existing = await queryRaw<{ n: number }>(
    `select count(*)::int as n from skins`,
  );
  if ((existing[0]?.n ?? 0) > 0) {
    g.__rmcSeeded = true;
    return;
  }

  await queryRaw(
    `insert into skins (id, name, description, css_vars, hero_overlay, is_default)
     values ($1, $2, $3, $4::jsonb, $5, $6), ($7, $8, $9, $10::jsonb, $11, $12)
     on conflict (id) do nothing`,
    [
      DEFAULT_SKIN.id,
      DEFAULT_SKIN.name,
      DEFAULT_SKIN.description,
      JSON.stringify(DEFAULT_SKIN.css_vars),
      DEFAULT_SKIN.hero_overlay,
      true,
      NOIR_SKIN.id,
      NOIR_SKIN.name,
      NOIR_SKIN.description,
      JSON.stringify(NOIR_SKIN.css_vars),
      NOIR_SKIN.hero_overlay,
      false,
    ],
  );

  for (const c of CONTENT_DEFAULTS) {
    await queryRaw(
      `insert into site_content (key, label, value) values ($1, $2, $3)
       on conflict (key) do nothing`,
      [c.key, c.label, c.value],
    );
  }

  await queryRaw(
    `insert into site_settings (key, value) values ('active_skin', $1)
     on conflict (key) do nothing`,
    [DEFAULT_SKIN.id],
  );

  const admin = ADMIN_EMAIL;
  const hash = await bcrypt.hash("movieclub-admin", 10);
  await queryRaw(
    `insert into users (email, password_hash, name, is_admin, notify_new_movies)
     values ($1, $2, $3, true, true)
     on conflict (email) do update set is_admin = true`,
    [admin, hash, "Brian Leigh"],
  );

  // Demo member for local RSVP / forum testing
  const memberHash = await bcrypt.hash("welcome123", 10);
  await queryRaw(
    `insert into users (email, password_hash, name, is_admin, notify_new_movies)
     values ($1, $2, $3, false, true)
     on conflict (email) do nothing`,
    ["member@example.com", memberHash, "Demo Member"],
  );

  const start = new Date();
  start.setDate(start.getDate() + ((6 - start.getDay() + 7) % 7 || 7)); // next Saturday
  start.setHours(13, 30, 0, 0);
  const end = new Date(start.getTime() + 125 * 60 * 1000);

  const movies = await queryRaw<{ id: string }>(
    `insert into movies (
      title, synopsis, genre, rating, length_minutes,
      showtime_start, showtime_end, youtube_trailer_id, reviews_summary,
      poster_url, cinema, skin_id, published
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true
    ) returning id`,
    [
      "The Wild Robot",
      "A robot shipwrecked on a wild island must learn to adapt, make friends, and become more than she was built to be. Warm, witty, and perfect for mixed-age club outings.",
      "Animation / Adventure / Family",
      "PG",
      102,
      start.toISOString(),
      end.toISOString(),
      "67yCbbuUpiw",
      "Critics praise the heart and craft — a gentle adventure with real emotional punch. Great pick when parents and kids want the same screening.",
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80",
      "Robinson Roi Et / Major Cineplex",
      DEFAULT_SKIN.id,
    ],
  );

  const later = new Date(start);
  later.setDate(later.getDate() + 7);
  later.setHours(19, 0, 0, 0);
  const laterEnd = new Date(later.getTime() + 130 * 60 * 1000);

  await queryRaw(
    `insert into movies (
      title, synopsis, genre, rating, length_minutes,
      showtime_start, showtime_end, youtube_trailer_id, reviews_summary,
      poster_url, cinema, skin_id, published
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true
    )`,
    [
      "A Real Pain",
      "Two mismatched cousins travel through Poland reconnecting with family history — funny, awkward, and unexpectedly moving. An adults-leaning English-language pick.",
      "Comedy / Drama",
      "R",
      90,
      later.toISOString(),
      laterEnd.toISOString(),
      "bZhrfoHBpR0",
      "A road-trip comedy with bite. Light reviews consensus: sharp performances and a bittersweet finish.",
      "https://images.unsplash.com/photo-1440404654427-65751636731b?auto=format&fit=crop&w=1200&q=80",
      "Robinson Roi Et / Major Cineplex",
      NOIR_SKIN.id,
    ],
  );

  await queryRaw(
    `insert into gallery_photos (title, caption, image_url, outing_date, sort_order) values
     ($1, $2, $3, $4, 1),
     ($5, $6, $7, $8, 2),
     ($9, $10, $11, $12, 3)`,
    [
      "Lobby meetup",
      "Finding each other before the lights went down.",
      "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80",
      "2025-09-14",
      "Post-film chat",
      "Ice cream and opinions in the food court.",
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      "2025-09-14",
      "Saturday crowd",
      "Teachers, students, and a few first-timers.",
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80",
      "2025-10-05",
    ],
  );

  if (movies[0]?.id) {
    const users = await queryRaw<{ id: string }>(
      `select id from users where email = $1`,
      [admin],
    );
    if (users[0]) {
      await queryRaw(
        `insert into forum_posts (movie_id, user_id, body) values ($1, $2, $3)`,
        [
          movies[0].id,
          users[0].id,
          "Looking forward to this one — afternoon show works well for families. Reply here if you need a meetup spot in the lobby.",
        ],
      );
    }
  }

  g.__rmcSeeded = true;
}
