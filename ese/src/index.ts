import { randomBytes, scryptSync } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import Fastify from "fastify";
import postgres from "postgres";
import { config } from "./config.js";
import { eseUsers } from "./db.js";

const sql = postgres(config.databaseUrl);
const db = drizzle(sql);

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}

/** Create the ESE tables if absent. ESE shares the AORMS Postgres (its own
 *  `ese_*` tables); there is no separate migration runner, so it self-provisions
 *  on boot (idempotent). Keep in sync with db.ts. */
async function ensureSchema(): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS ese_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'kbteam',
    must_change_password boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS ese_source (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL,
    authority text NOT NULL,
    year integer NOT NULL,
    file_key text NOT NULL,
    status text NOT NULL DEFAULT 'UPLOADED',
    markdown text,
    extracted jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS ese_pack (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_type text NOT NULL,
    edition text NOT NULL UNIQUE,
    checksum text NOT NULL,
    payload jsonb NOT NULL,
    published_by_id uuid REFERENCES ese_user(id),
    published_at timestamptz NOT NULL DEFAULT now()
  )`;
}

/** Seed the default kbteam admin at deploy (env-declared), forced to rotate. */
async function seedAdmin(): Promise<void> {
  if (!config.adminPassword) {
    console.warn("[ESE] ESE_ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }
  const existing = await db.select().from(eseUsers).where(eq(eseUsers.username, config.adminUser)).limit(1);
  if (existing.length) return;
  await db.insert(eseUsers).values({
    username: config.adminUser,
    passwordHash: hashPassword(config.adminPassword),
    role: "kbteam",
    mustChangePassword: true,
  });
  console.log(`[ESE] Seeded kbteam admin "${config.adminUser}" (must change password on first login).`);
}

async function main(): Promise<void> {
  await ensureSchema();
  await seedAdmin();

  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true, service: "ese" }));

  // Pipeline endpoints (scaffold) — upload a source, run stages, publish a pack.
  // Real handlers land with the per-source parsers (see ESTIMATION-SPEC-ENGINE.md).
  app.post("/sources", async () => ({ todo: "accept a PDF/markdown source, store, mark UPLOADED" }));
  app.post("/sources/:id/convert", async () => ({ todo: "pdf→md + format" }));
  app.post("/sources/:id/analyze", async () => ({ todo: "Ollama structure/extract → draft entities" }));
  app.post("/packs/:id/publish", async () => ({ todo: "checksum + freeze an immutable pack edition" }));
  app.get("/packs", async () => ({ todo: "list published packs for the apps to pull" }));

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[ESE] listening on :${config.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
