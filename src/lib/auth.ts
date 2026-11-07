import bcrypt from "bcryptjs";
import { queryRaw, sql } from "./db";
import type { User } from "./types";
import { readSession } from "./session";
import { ADMIN_EMAIL } from "./constants";

export function adminEmail(): string {
  return ADMIN_EMAIL;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    is_admin: Boolean(row.is_admin),
    notify_new_movies: Boolean(row.notify_new_movies),
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `select id, email, name, is_admin, notify_new_movies from users where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `select id, email, name, is_admin, notify_new_movies from users where id = $1 limit 1`,
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(input: {
  email: string;
  password?: string;
  name: string;
  googleId?: string;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  const hash = input.password
    ? await bcrypt.hash(input.password, 10)
    : null;
  const rows = await sql<Record<string, unknown>>(
    `insert into users (email, password_hash, name, google_id, is_admin)
     values ($1, $2, $3, $4, $5)
     returning id, email, name, is_admin, notify_new_movies`,
    [email, hash, input.name.trim() || email.split("@")[0], input.googleId ?? null, isAdmin],
  );
  return mapUser(rows[0]);
}

export async function verifyPassword(
  email: string,
  password: string,
): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `select id, email, name, is_admin, notify_new_movies, password_hash
     from users where lower(email) = lower($1) limit 1`,
    [email],
  );
  const row = rows[0];
  if (!row?.password_hash) return null;
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) return null;
  return mapUser(row);
}

export async function upsertGoogleUser(input: {
  email: string;
  name: string;
  googleId: string;
}): Promise<User> {
  const existing = await sql<Record<string, unknown>>(
    `select id, email, name, is_admin, notify_new_movies from users
     where google_id = $1 or lower(email) = lower($2) limit 1`,
    [input.googleId, input.email],
  );
  if (existing[0]) {
    const rows = await sql<Record<string, unknown>>(
      `update users set google_id = coalesce(google_id, $1), name = case when name = '' then $2 else name end
       where id = $3
       returning id, email, name, is_admin, notify_new_movies`,
      [input.googleId, input.name, existing[0].id],
    );
    return mapUser(rows[0]);
  }
  return createUser({
    email: input.email,
    name: input.name,
    googleId: input.googleId,
  });
}

export async function requireUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  return findUserById(session.sub);
}

export async function requireAdmin(): Promise<User | null> {
  const user = await requireUser();
  if (!user?.is_admin) return null;
  return user;
}

/** Used by seed before ensureReady finishes — bypasses seed recursion. */
export async function seedCreateAdmin(email: string, password: string, name: string) {
  const hash = await bcrypt.hash(password, 10);
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL;
  await queryRaw(
    `insert into users (email, password_hash, name, is_admin)
     values ($1, $2, $3, $4)
     on conflict (email) do update set is_admin = excluded.is_admin`,
    [email.toLowerCase(), hash, name, isAdmin || true],
  );
}
