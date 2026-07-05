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
