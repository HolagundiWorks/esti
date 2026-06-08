import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../env.js";

/**
 * Apply pending Drizzle migrations on boot. Replaces ad-hoc `drizzle-kit push
 * --force` (which is destructive and untracked) with the committed, ordered
 * migrations in ../../drizzle. Idempotent — already-applied migrations are
 * skipped via the drizzle.__drizzle_migrations bookkeeping table.
 */
export async function runMigrations(): Promise<void> {
  // Resolve relative to this module so it works under tsx (src) and dist alike.
  const folder = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "drizzle");
  // A dedicated single-use connection; the app pool is created separately.
  const client = postgres(env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: folder });
  } finally {
    await client.end();
  }
}
