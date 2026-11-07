import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import type { User } from "./types";
import { readSession } from "./session";
import { ADMIN_EMAIL } from "./constants";
import { sendVerificationEmail } from "./email";

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
    email_verified: Boolean(row.email_verified),
  };
}

const USER_COLS =
  "id, email, name, is_admin, notify_new_movies, email_verified";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `select ${USER_COLS} from users where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `select ${USER_COLS} from users where id = $1 limit 1`,
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createUser(input: {
  email: string;
  password?: string;
  name: string;
  googleId?: string;
  emailVerified?: boolean;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;
  const hash = input.password ? await bcrypt.hash(input.password, 10) : null;
  const verified = input.emailVerified ?? Boolean(input.googleId);
  const rows = await sql<Record<string, unknown>>(
    `insert into users (email, password_hash, name, google_id, is_admin, email_verified)
     values ($1, $2, $3, $4, $5, $6)
     returning ${USER_COLS}`,
    [
      email,
      hash,
      input.name.trim() || email.split("@")[0],
      input.googleId ?? null,
      isAdmin,
      verified,
    ],
  );
  return mapUser(rows[0]);
}

/** Refresh credentials on an unverified password signup and keep it unverified. */
export async function resetUnverifiedPasswordUser(input: {
  userId: string;
  password: string;
  name: string;
}): Promise<User> {
  const hash = await bcrypt.hash(input.password, 10);
  const rows = await sql<Record<string, unknown>>(
    `update users
     set password_hash = $1,
         name = $2,
         email_verified = false
     where id = $3
     returning ${USER_COLS}`,
    [hash, input.name.trim(), input.userId],
  );
  return mapUser(rows[0]);
}

export async function verifyPassword(
  email: string,
  password: string,
): Promise<{ user: User | null; reason?: "invalid" | "unverified" }> {
  const rows = await sql<Record<string, unknown>>(
    `select ${USER_COLS}, password_hash
     from users where lower(email) = lower($1) limit 1`,
    [email],
  );
  const row = rows[0];
  if (!row?.password_hash) return { user: null, reason: "invalid" };
  const ok = await bcrypt.compare(password, String(row.password_hash));
  if (!ok) return { user: null, reason: "invalid" };
  const user = mapUser(row);
  if (!user.email_verified) return { user: null, reason: "unverified" };
  return { user };
}

export async function upsertGoogleUser(input: {
  email: string;
  name: string;
  googleId: string;
}): Promise<User> {
  const existing = await sql<Record<string, unknown>>(
    `select ${USER_COLS} from users
     where google_id = $1 or lower(email) = lower($2) limit 1`,
    [input.googleId, input.email],
  );
  if (existing[0]) {
    const rows = await sql<Record<string, unknown>>(
      `update users
       set google_id = coalesce(google_id, $1),
           name = case when name = '' then $2 else name end,
           email_verified = true
       where id = $3
       returning ${USER_COLS}`,
      [input.googleId, input.name, existing[0].id],
    );
    return mapUser(rows[0]);
  }
  return createUser({
    email: input.email,
    name: input.name,
    googleId: input.googleId,
    emailVerified: true,
  });
}

export async function issueEmailVerification(
  userId: string,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await sql(`delete from email_verification_tokens where user_id = $1`, [
    userId,
  ]);
  await sql(
    `insert into email_verification_tokens (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [userId, tokenHash, expires.toISOString()],
  );
  return token;
}

export async function consumeEmailVerificationToken(
  token: string,
): Promise<User | null> {
  const tokenHash = hashToken(token);
  const rows = await sql<Record<string, unknown>>(
    `select t.id as token_id, u.id, u.email, u.name, u.is_admin,
            u.notify_new_movies, u.email_verified
     from email_verification_tokens t
     join users u on u.id = t.user_id
     where t.token_hash = $1 and t.expires_at > now()
     limit 1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  await sql(`delete from email_verification_tokens where user_id = $1`, [
    row.id,
  ]);
  const updated = await sql<Record<string, unknown>>(
    `update users set email_verified = true where id = $1
     returning ${USER_COLS}`,
    [row.id],
  );
  return updated[0] ? mapUser(updated[0]) : null;
}

export async function startEmailVerification(input: {
  user: User;
  origin: string;
}): Promise<{ stubbed: boolean; verifyUrl?: string }> {
  const token = await issueEmailVerification(input.user.id);
  const verifyUrl = `${input.origin.replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  return sendVerificationEmail({
    email: input.user.email,
    name: input.user.name,
    verifyUrl,
  });
}

export async function requireUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user?.email_verified) return null;
  return user;
}

export async function requireAdmin(): Promise<User | null> {
  const user = await requireUser();
  if (!user?.is_admin) return null;
  return user;
}
