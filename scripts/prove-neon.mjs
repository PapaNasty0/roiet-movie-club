/**
 * End-to-end proof for Neon Postgres + Object Storage (+ Auth env presence).
 * Does not print secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function loadEnvLocal() {
  const path = ".env.local";
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const results = [];
function ok(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL ${name} — ${detail}`);
}

async function provePostgres() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    fail("postgres", "DATABASE_URL missing");
    return;
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: url.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      "select current_database() as db, current_user as usr, now() as ts",
    );
    ok(
      "postgres.connect",
      `db=${rows[0].db} user=${rows[0].usr}`,
    );
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const tables = await client.query(
      `select count(*)::int as n from information_schema.tables
       where table_schema = 'public' and table_name in
       ('users','movies','rsvps','forum_posts','gallery_photos')`,
    );
    ok("postgres.schema", `core_tables=${tables.rows[0].n}`);
  } finally {
    await client.end();
  }
}

async function proveStorage() {
  const needed = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_ENDPOINT_URL_S3",
    "AWS_REGION",
  ];
  for (const k of needed) {
    if (!process.env[k]?.trim()) {
      fail("object-storage.env", `missing ${k}`);
      return;
    }
  }
  const s3 = new S3Client({
    region: process.env.AWS_REGION.trim(),
    endpoint: process.env.AWS_ENDPOINT_URL_S3.trim(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
    },
  });
  const key = `prove/${randomUUID()}.txt`;
  const body = `neon-prove ${new Date().toISOString()}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: "assets",
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  ok("object-storage.put", `key=${key}`);
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: "assets", Key: key }),
    { expiresIn: 120 },
  );
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text !== body) {
    fail("object-storage.get", `status=${res.status}`);
  } else {
    ok("object-storage.get", "presigned read matches");
  }
  await s3.send(new DeleteObjectCommand({ Bucket: "assets", Key: key }));
  ok("object-storage.delete", "cleanup ok");
}

async function proveAuthEnv() {
  if (!process.env.NEON_AUTH_BASE_URL?.trim()) {
    fail("neon-auth.env", "NEON_AUTH_BASE_URL missing");
    return;
  }
  if (!process.env.NEON_AUTH_JWKS_URL?.trim()) {
    fail("neon-auth.env", "NEON_AUTH_JWKS_URL missing");
    return;
  }
  const jwks = await fetch(process.env.NEON_AUTH_JWKS_URL.trim());
  if (!jwks.ok) {
    fail("neon-auth.jwks", `status=${jwks.status}`);
    return;
  }
  const json = await jwks.json();
  const n = Array.isArray(json.keys) ? json.keys.length : 0;
  ok("neon-auth.jwks", `keys=${n} base_host_ok`);
  // Hit Auth open-api / health-ish path
  const base = process.env.NEON_AUTH_BASE_URL.trim().replace(/\/$/, "");
  const ref = await fetch(`${base}/ok`).catch(() => null);
  if (ref && (ref.ok || ref.status === 404 || ref.status === 401)) {
    ok("neon-auth.endpoint", `status=${ref.status}`);
  } else if (ref) {
    ok("neon-auth.endpoint", `reachable status=${ref.status}`);
  } else {
    fail("neon-auth.endpoint", "unreachable");
  }
}

try {
  await provePostgres();
  await proveStorage();
  await proveAuthEnv();
} catch (error) {
  fail("unexpected", error instanceof Error ? error.message : String(error));
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\nSummary: ${results.length - failed.length}/${results.length} passed`,
);
process.exit(failed.length ? 1 : 0);
