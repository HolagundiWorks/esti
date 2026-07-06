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

  // Root — a friendly status page so the bare domain (ese.<domain>) doesn't 404.
  // ESE is a back-office API; the publisher console is not built yet, so this
  // simply confirms the service is live and lists the available endpoints.
  app.get("/", async (_req, reply) => {
    reply.type("text/html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ESE — Estimation Specification Engine</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background:#F1F6F4; color:#172B36; display:grid; place-items:center; min-height:100vh; }
  main { max-width:34rem; padding:2.5rem; background:#fff; border:1px solid rgba(23,43,54,.08);
    border-top:3px solid #FFC801; }
  h1 { font-weight:300; letter-spacing:-.01em; margin:0 0 .25rem; }
  .eyebrow { text-transform:uppercase; letter-spacing:.08em; font-size:.6875rem; font-weight:600;
    color:#516069; margin:0 0 1rem; }
  .status { display:inline-block; font-size:.75rem; font-weight:600; color:#172B36;
    background:#FFC801; padding:.15rem .5rem; margin:.5rem 0 1.25rem; }
  p { color:#516069; line-height:1.5; }
  ul { color:#516069; padding-left:1.1rem; } li { margin:.2rem 0; }
  code { font-family:ui-monospace, monospace; color:#114C5A; }
</style></head>
<body><main>
  <p class="eyebrow">AORMS · Back office</p>
  <h1>Estimation Specification Engine</h1>
  <span class="status">● Service running</span>
  <p>ESE publishes the sealed estimation packs the AORMS apps pull. The publisher
  console is in development; the API is available at:</p>
  <ul>
    <li><code>GET&nbsp;/health</code> — liveness</li>
    <li><code>POST&nbsp;/sources</code> — upload a source (PDF / markdown)</li>
    <li><code>POST&nbsp;/sources/:id/convert</code> · <code>/analyze</code></li>
    <li><code>POST&nbsp;/packs/:id/publish</code> · <code>GET&nbsp;/packs</code></li>
  </ul>
</main></body></html>`);
  });

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
