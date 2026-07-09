import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import { EsePack } from "@esti/contracts";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import postgres from "postgres";
import {
  SESSION_COOKIE,
  clearCookie,
  hashPassword,
  readCookie,
  sessionCookie,
  signSession,
  verifyPassword,
  verifySession,
} from "./auth.js";
import { config } from "./config.js";
import { eachPackType, eseKinds, esePacks, eseSources, eseStatuses, eseUsers } from "./db.js";
import { consolePage, loginPage } from "./ui.js";

const sql = postgres(config.databaseUrl);
const db = drizzle(sql);

type EseUser = typeof eseUsers.$inferSelect;

/** Create the ESE tables if absent (shares the AORMS Postgres; ese_* tables). */
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

/** Deterministic JSON (sorted keys) so a pack's checksum is stable. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function currentUser(req: FastifyRequest): EseUser | null {
  return (req as FastifyRequest & { eseUser?: EseUser | null }).eseUser ?? null;
}

async function main(): Promise<void> {
  await ensureSchema();
  await seedAdmin();
  await mkdir(config.storageDir, { recursive: true });

  const app = Fastify({ logger: true, bodyLimit: 25 * 1024 * 1024 });
  // Cast the register call: the monorepo resolves both fastify 4 (backend) and 5
  // (ese) type trees, so the plugin's instance generic skews against ours. Runtime
  // is fastify 5 + @fastify/multipart 9 — compatible.
  await (app.register as unknown as (p: unknown, o: unknown) => Promise<unknown>)(multipart, {
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  // ── Auth gate: load the session user; guard everything but the public routes ──
  const PUBLIC = new Set(["/health", "/login", "/api/login"]);
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const path = req.url.split("?")[0] ?? req.url;
    if (PUBLIC.has(path)) return;
    const userId = verifySession(readCookie(req.headers.cookie, SESSION_COOKIE), config.sessionSecret);
    const user = userId
      ? (await db.select().from(eseUsers).where(eq(eseUsers.id, userId)).limit(1))[0] ?? null
      : null;
    (req as FastifyRequest & { eseUser?: EseUser | null }).eseUser = user;
    if (!user) {
      if (path.startsWith("/api/")) return reply.code(401).send({ error: "unauthorized" });
      return reply.redirect("/login");
    }
  });

  // ── Pages ──────────────────────────────────────────────────────────────────
  app.get("/health", async () => ({ ok: true, service: "ese" }));
  app.get("/login", async (_req, reply) => reply.type("text/html").send(loginPage()));
  app.get("/", async (_req, reply) => reply.type("text/html").send(consolePage()));

  // ── Auth API ────────────────────────────────────────────────────────────────
  app.post("/api/login", async (req, reply) => {
    const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
    if (!username || !password) return reply.code(400).send({ error: "Username and password are required." });
    const user = (await db.select().from(eseUsers).where(eq(eseUsers.username, username)).limit(1))[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.code(401).send({ error: "Invalid username or password." });
    }
    reply.header("set-cookie", sessionCookie(signSession(user.id, config.sessionSecret)));
    return { ok: true, mustChangePassword: user.mustChangePassword };
  });

  app.post("/api/logout", async (_req, reply) => {
    reply.header("set-cookie", clearCookie());
    return { ok: true };
  });

  app.get("/api/me", async (req) => {
    const u = currentUser(req)!;
    return { id: u.id, username: u.username, role: u.role, mustChangePassword: u.mustChangePassword };
  });

  app.post("/api/account/password", async (req, reply) => {
    const u = currentUser(req)!;
    const { currentPassword, newPassword } = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };
    if (!newPassword || newPassword.length < 8) return reply.code(400).send({ error: "New password must be at least 8 characters." });
    if (!currentPassword || !verifyPassword(currentPassword, u.passwordHash)) {
      return reply.code(400).send({ error: "Current password is incorrect." });
    }
    await db.update(eseUsers).set({ passwordHash: hashPassword(newPassword), mustChangePassword: false }).where(eq(eseUsers.id, u.id));
    return { ok: true };
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get("/api/stats", async () => {
    const [sources, packs, users] = await Promise.all([
      db.select().from(eseSources),
      db.select({ id: esePacks.id }).from(esePacks),
      db.select({ id: eseUsers.id }).from(eseUsers),
    ]);
    const sourcesByStatus: Record<string, number> = {};
    for (const s of sources) sourcesByStatus[s.status] = (sourcesByStatus[s.status] ?? 0) + 1;
    return { sources: sources.length, packs: packs.length, users: users.length, sourcesByStatus };
  });

  // ── Sources ─────────────────────────────────────────────────────────────────
  app.get("/api/sources", async () => {
    const rows = await db.select().from(eseSources).orderBy(desc(eseSources.updatedAt));
    return rows.map((s) => ({
      id: s.id, kind: s.kind, authority: s.authority, year: s.year, status: s.status,
      fileKey: s.fileKey, hasMarkdown: !!s.markdown, hasExtracted: s.extracted != null,
      createdAt: s.createdAt, updatedAt: s.updatedAt,
    }));
  });

  app.post("/api/sources", async (req, reply) => {
    const b = (req.body ?? {}) as { kind?: string; authority?: string; year?: number };
    const kind = String(b.kind ?? "").toUpperCase();
    if (!eseKinds.includes(kind)) return reply.code(400).send({ error: `kind must be one of ${eseKinds.join(", ")}.` });
    if (!b.authority?.trim()) return reply.code(400).send({ error: "Authority is required." });
    const year = Number(b.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return reply.code(400).send({ error: "Year is invalid." });
    const [row] = await db.insert(eseSources).values({
      kind, authority: b.authority.trim(), year, fileKey: "", status: "UPLOADED",
    }).returning();
    return row;
  });

  app.get("/api/sources/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = (await db.select().from(eseSources).where(eq(eseSources.id, id)).limit(1))[0];
    if (!row) return reply.code(404).send({ error: "Source not found." });
    return row;
  });

  app.patch("/api/sources/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.kind === "string" && eseKinds.includes(b.kind.toUpperCase())) patch.kind = b.kind.toUpperCase();
    if (typeof b.authority === "string") patch.authority = b.authority.trim();
    if (b.year !== undefined && Number.isInteger(Number(b.year))) patch.year = Number(b.year);
    if (typeof b.status === "string" && eseStatuses.includes(b.status)) patch.status = b.status;
    if (b.markdown !== undefined) patch.markdown = b.markdown === "" ? null : String(b.markdown);
    if (b.extracted !== undefined) patch.extracted = b.extracted; // object | null
    const [row] = await db.update(eseSources).set(patch).where(eq(eseSources.id, id)).returning();
    if (!row) return reply.code(404).send({ error: "Source not found." });
    return row;
  });

  app.post("/api/sources/:id/file", async (req, reply) => {
    const { id } = req.params as { id: string };
    const src = (await db.select().from(eseSources).where(eq(eseSources.id, id)).limit(1))[0];
    if (!src) return reply.code(404).send({ error: "Source not found." });
    // @fastify/multipart augments FastifyRequest.file(); typed inline to dodge the
    // fastify v4/v5 declaration-merge skew described at register() above.
    const data = await (req as unknown as {
      file: () => Promise<{ filename: string; file: NodeJS.ReadableStream } | undefined>;
    }).file();
    if (!data) return reply.code(400).send({ error: "No file in the request." });
    const safeName = data.filename.replace(/[^\w.-]+/g, "_").slice(-80);
    const fileKey = `${randomUUID()}-${safeName}`;
    await pipeline(data.file, createWriteStream(join(config.storageDir, fileKey)));
    if (src.fileKey) await unlink(join(config.storageDir, src.fileKey)).catch(() => {});
    await db.update(eseSources).set({ fileKey, updatedAt: new Date() }).where(eq(eseSources.id, id));
    return { ok: true, fileKey };
  });

  app.get("/api/sources/:id/file", async (req, reply) => {
    const { id } = req.params as { id: string };
    const src = (await db.select().from(eseSources).where(eq(eseSources.id, id)).limit(1))[0];
    if (!src?.fileKey) return reply.code(404).send({ error: "No file for this source." });
    const name = src.fileKey.slice(src.fileKey.indexOf("-") + 1) || "source";
    reply.header("content-disposition", `attachment; filename="${name}"`);
    reply.type("application/octet-stream");
    return reply.send(createReadStream(join(config.storageDir, src.fileKey)));
  });

  app.delete("/api/sources/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = await db.delete(eseSources).where(eq(eseSources.id, id)).returning();
    if (!row) return reply.code(404).send({ error: "Source not found." });
    if (row.fileKey) await unlink(join(config.storageDir, row.fileKey)).catch(() => {});
    return { ok: true };
  });

  // ── Packs ─────────────────────────────────────────────────────────────────
  app.get("/api/packs", async () => {
    const rows = await db.select({
      id: esePacks.id, packType: esePacks.packType, edition: esePacks.edition,
      checksum: esePacks.checksum, publishedAt: esePacks.publishedAt, publishedById: esePacks.publishedById,
    }).from(esePacks).orderBy(desc(esePacks.publishedAt));
    return rows;
  });

  app.post("/api/packs", async (req, reply) => {
    const u = currentUser(req)!;
    const b = (req.body ?? {}) as { packType?: string; edition?: string; sourceId?: string; payload?: Record<string, unknown> };
    const packType = String(b.packType ?? "");
    if (!eachPackType.includes(packType)) return reply.code(400).send({ error: `packType must be one of ${eachPackType.join(", ")}.` });
    const edition = String(b.edition ?? "").trim();
    if (!edition) return reply.code(400).send({ error: "Edition is required." });

    let base: Record<string, unknown> | undefined = b.payload;
    if (!base && b.sourceId) {
      const src = (await db.select().from(eseSources).where(eq(eseSources.id, b.sourceId)).limit(1))[0];
      if (!src) return reply.code(400).send({ error: "Seed source not found." });
      if (src.extracted == null || typeof src.extracted !== "object") {
        return reply.code(400).send({ error: "The seed source has no extracted JSON to build from." });
      }
      base = src.extracted as Record<string, unknown>;
    }
    if (!base) return reply.code(400).send({ error: "Provide a pack payload, or seed from a source." });

    // Stamp the identifying fields + a stable checksum, then validate against EsePack.
    const draft: Record<string, unknown> = { formatVersion: 1, ...base, packType, edition, checksum: "" };
    const checksum = createHash("sha256").update(canonical({ ...draft, checksum: undefined })).digest("hex");
    draft.checksum = checksum;
    const parsed = EsePack.safeParse(draft);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join(" · ");
      return reply.code(400).send({ error: `Pack failed validation — ${issues}` });
    }
    try {
      const [row] = await db.insert(esePacks).values({
        packType, edition, checksum, payload: parsed.data as unknown as Record<string, unknown>, publishedById: u.id,
      }).returning({ id: esePacks.id, edition: esePacks.edition });
      return { ok: true, id: row!.id, edition: row!.edition, checksum };
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return reply.code(409).send({ error: `Edition "${edition}" already exists — editions are immutable.` });
      throw e;
    }
  });

  app.get("/api/packs/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = (await db.select().from(esePacks).where(eq(esePacks.id, id)).limit(1))[0];
    if (!row) return reply.code(404).send({ error: "Pack not found." });
    reply.header("content-disposition", `attachment; filename="${row.edition}.pack.json"`);
    reply.type("application/json");
    return reply.send(JSON.stringify(row.payload, null, 2));
  });

  app.delete("/api/packs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const [row] = await db.delete(esePacks).where(eq(esePacks.id, id)).returning({ id: esePacks.id });
    if (!row) return reply.code(404).send({ error: "Pack not found." });
    return { ok: true };
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  app.get("/api/users", async () => {
    const rows = await db.select({
      id: eseUsers.id, username: eseUsers.username, role: eseUsers.role,
      mustChangePassword: eseUsers.mustChangePassword, createdAt: eseUsers.createdAt,
    }).from(eseUsers).orderBy(eseUsers.createdAt);
    return rows;
  });

  app.post("/api/users", async (req, reply) => {
    const b = (req.body ?? {}) as { username?: string; password?: string };
    const username = String(b.username ?? "").trim();
    if (!username) return reply.code(400).send({ error: "Username is required." });
    if (!b.password || b.password.length < 8) return reply.code(400).send({ error: "Password must be at least 8 characters." });
    try {
      const [row] = await db.insert(eseUsers).values({
        username, passwordHash: hashPassword(b.password), role: "kbteam", mustChangePassword: true,
      }).returning({ id: eseUsers.id, username: eseUsers.username });
      return { ok: true, id: row!.id, username: row!.username };
    } catch (e) {
      if ((e as { code?: string }).code === "23505") return reply.code(409).send({ error: `User "${username}" already exists.` });
      throw e;
    }
  });

  app.post("/api/users/:id/reset", async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as { password?: string };
    if (!b.password || b.password.length < 8) return reply.code(400).send({ error: "Password must be at least 8 characters." });
    const [row] = await db.update(eseUsers)
      .set({ passwordHash: hashPassword(b.password), mustChangePassword: true })
      .where(eq(eseUsers.id, id)).returning({ id: eseUsers.id });
    if (!row) return reply.code(404).send({ error: "User not found." });
    return { ok: true };
  });

  app.delete("/api/users/:id", async (req, reply) => {
    const u = currentUser(req)!;
    const { id } = req.params as { id: string };
    if (id === u.id) return reply.code(400).send({ error: "You cannot delete your own account." });
    const count = (await db.select({ id: eseUsers.id }).from(eseUsers)).length;
    if (count <= 1) return reply.code(400).send({ error: "Cannot delete the last user." });
    const [row] = await db.delete(eseUsers).where(eq(eseUsers.id, id)).returning({ id: eseUsers.id });
    if (!row) return reply.code(404).send({ error: "User not found." });
    return { ok: true };
  });

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`[ESE] listening on :${config.port}`);
}

main().catch((e) => {
  console.error("[ESE] fatal", e);
  process.exit(1);
});
