import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

type GlobalDb = {
  pool?: pg.Pool;
  local?: Promise<PGlite>;
  ready?: Promise<void>;
};

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const g = globalThis as typeof globalThis & { __rmcDb?: GlobalDb };
g.__rmcDb ??= {};

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureReady();
  return queryRaw<T>(text, params);
}

async function ensureReady(): Promise<void> {
  if (!g.__rmcDb!.ready) {
    g.__rmcDb!.ready = (async () => {
      if (databaseUrl === "") {
        await getLocal();
      }
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty();
    })().catch((error: unknown) => {
      g.__rmcDb!.ready = undefined;
      throw error;
    });
  }
  await g.__rmcDb!.ready;
}

export async function queryRaw<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    g.__rmcDb!.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await g.__rmcDb!.pool.query(text, params)).rows as T[];
  }
  const db = await getLocal();
  return (await db.query<T>(text, params)).rows;
}

async function getLocal(): Promise<PGlite> {
  g.__rmcDb!.local ??= startLocal().catch((error: unknown) => {
    g.__rmcDb!.local = undefined;
    throw error;
  });
  return g.__rmcDb!.local;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
