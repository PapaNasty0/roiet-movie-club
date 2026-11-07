import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import type { User } from "./types";
import { readSession } from "./session";
import { ADMIN_EMAIL } from "./constants";
import { resendConfigured, sendVerificationEmail } from "./email";

export function adminEmail(): string {
  return ADMIN_EMAIL;
}

function isRealGoogleId(googleId: unknown): boolean {
  if (googleId == null) return false;
  const id = String(googleId);
  if (!id) return false;
  // Neon Auth bridge stores placeholders as neon:… — not Google OAuth.
  if (id.startsWith("neon:")) return false;
  return true;
}

function mapUser(row: Record<string, unknown>): User {
  const hasPassword =
    row.has_password !== undefined
      ? Boolean(row.has_password)
      : row.password_hash != null && String(row.password_hash).length > 0;
  const hasGoogle =
    row.has_google !== undefined
      ? Boolean(row.has_google)
      : isRealGoogleId(row.google_id);
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ""),
    is_admin: Boolean(row.is_admin),
    notify_new_movies: Boolean(row.notify_new_movies),
    email_verified: Boolean(row.email_verified),
    has_password: hasPassword,
    has_google: hasGoogle,
  };
}

const USER_COLS = `id, email, name, is_admin, notify_new_movies, email_verified,
  (password_hash is not null) as has_password,
  (google_id is not null and google_id not like 'neon:%') as has_google`;

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

/** Refresh credentials on an unverified password signup. */
export async function resetUnverifiedPasswordUser(input: {
  userId: string;
  password: string;
  name: string;
  emailVerified?: boolean;
}): Promise<User> {
  const hash = await bcrypt.hash(input.password, 10);
  const verified = input.emailVerified ?? false;
  const rows = await sql<Record<string, unknown>>(
    `update users
     set password_hash = $1,
         name = $2,
         email_verified = $3
     where id = $4
     returning ${USER_COLS}`,
    [hash, input.name.trim(), verified, input.userId],
  );
  return mapUser(rows[0]);
}

/**
 * When Resend is unset, ADMIN_EMAIL cannot receive a confirmation link.
 * Correct password marks that account verified. Closes once RESEND_API_KEY
 * is bound. Never applies to non-admin emails.
 */
export function adminPasswordBootstrapAllowed(email: string): boolean {
  return !resendConfigured() && email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function markEmailVerified(userId: string): Promise<User | null> {
  const rows = await sql<Record<string, unknown>>(
    `update users set email_verified = true, is_admin = case
       when lower(email) = lower($2) then true else is_admin end
     where id = $1
     returning ${USER_COLS}`,
    [userId, ADMIN_EMAIL],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function updateDisplayName(
  userId: string,
  name: string,
): Promise<User | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const rows = await sql<Record<string, unknown>>(
    `update users set name = $1 where id = $2 returning ${USER_COLS}`,
    [trimmed.slice(0, 80), userId],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function setUserPassword(
  userId: string,
  password: string,
): Promise<User | null> {
  if (password.length < 8 || password.length > 100) return null;
  const hash = await bcrypt.hash(password, 10);
  const rows = await sql<Record<string, unknown>>(
    `update users set password_hash = $1 where id = $2 returning ${USER_COLS}`,
    [hash, userId],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

/**
 * Link Google to the signed-in account. Google email must match the account
 * email (same person). Fails if this Google id belongs to someone else.
 */
export async function linkGoogleToUser(input: {
  userId: string;
  email: string;
  googleId: string;
  name?: string;
}): Promise<
  | { ok: true; user: User }
  | { ok: false; reason: "mismatch" | "conflict" | "missing" }
> {
  const user = await findUserById(input.userId);
  if (!user) return { ok: false, reason: "missing" };
  if (user.email.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
    return { ok: false, reason: "mismatch" };
  }
  const taken = await sql<{ id: string }>(
    `select id from users where google_id = $1 and id <> $2 limit 1`,
    [input.googleId, input.userId],
  );
  if (taken[0]) return { ok: false, reason: "conflict" };

  const rows = await sql<Record<string, unknown>>(
    `update users
     set google_id = $1,
         email_verified = true,
         name = case when name = '' and $2 <> '' then $2 else name end
     where id = $3
     returning ${USER_COLS}`,
    [input.googleId, (input.name || "").trim(), input.userId],
  );
  if (!rows[0]) return { ok: false, reason: "missing" };
  return { ok: true, user: mapUser(rows[0]) };
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
  if (!user.email_verified) {
    if (adminPasswordBootstrapAllowed(user.email)) {
      const bootstrapped = await markEmailVerified(user.id);
      if (bootstrapped) {
        console.info(
          `[auth] Admin password bootstrap verified ${bootstrapped.email} (RESEND unset)`,
        );
        return { user: bootstrapped };
      }
    }
    return { user: null, reason: "unverified" };
  }
  return { user };
}

export async function upsertGoogleUser(input: {
  email: string;
  name: string;
  googleId: string;
}): Promise<User> {
  // Prefer exact Google id, then same email → one account per person.
  const byGoogle = await sql<Record<string, unknown>>(
    `select ${USER_COLS} from users where google_id = $1 limit 1`,
    [input.googleId],
  );
  const byEmail = byGoogle[0]
    ? []
    : await sql<Record<string, unknown>>(
        `select ${USER_COLS} from users where lower(email) = lower($1) limit 1`,
        [input.email],
      );
  const existing = byGoogle[0] || byEmail[0];
  if (existing) {
    const rows = await sql<Record<string, unknown>>(
      `update users
       set google_id = case
             when google_id is null or google_id like 'neon:%' then $1
             else google_id
           end,
           name = case when name = '' then $2 else name end,
           email_verified = true
       where id = $3
       returning ${USER_COLS}`,
      [input.googleId, input.name, existing.id],
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
    `select t.user_id
     from email_verification_tokens t
     where t.token_hash = $1 and t.expires_at > now()
     limit 1`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  await sql(`delete from email_verification_tokens where user_id = $1`, [
    row.user_id,
  ]);
  const updated = await sql<Record<string, unknown>>(
    `update users set email_verified = true where id = $1
     returning ${USER_COLS}`,
    [row.user_id],
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
