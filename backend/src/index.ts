import { DRAWING_MAX_BYTES } from "@esti/contracts";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { redis } from "./lib/redis.js";
import { originDenial, parseAllowedOrigins } from "./lib/origin.js";
import { BUCKET, s3 } from "./lib/storage.js";
import { registerDrawingUpload } from "./modules/drawing/upload.js";
import { registerFirmLogoUpload } from "./modules/firm/upload.js";
import { registerReconcileUpload } from "./modules/reconcile/upload.js";
import { registerMoodImageUpload } from "./modules/spec/upload.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

// trustProxy lets req.ip reflect X-Forwarded-For behind the dev/prod proxy so
// per-IP rate limits key on the real client, not the proxy.
// maxParamLength is raised because tRPC batches the procedure list into the
// route param — the default of 100 chars 404s large batched GETs.
// requestIdHeader: honour X-Request-Id sent by the SPA; generate a UUID when
// the header is absent (genReqId), and echo it back in every response for
// correlation (addHook onSend below).
const app = Fastify({
  logger: true,
  requestIdHeader: "x-request-id",
  genReqId: () => crypto.randomUUID(),
  trustProxy: true,
  maxParamLength: 5000,
});

const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

app.addHook("onRequest", (req, reply, done) => {
  const denial = originDenial(req.method, req.headers.origin, allowedOrigins);
  if (denial) {
    void reply.code(403).send({ error: denial });
    return;
  }
  done();
});

app.addHook("onSend", (_req, reply, _payload, done) => {
  reply.header("x-request-id", _req.id);
  done();
});

// Coarse global abuse protection (per IP). Generous enough for the SPA's
// normal tRPC + polling traffic; upload routes set a stricter cap below.
await app.register(rateLimit, { global: true, max: 600, timeWindow: "1 minute" });

// Bring the schema up to date before serving traffic (idempotent).
try {
  await runMigrations();
  app.log.info("migrations applied");
} catch (err) {
  app.log.error(err, "migration failed");
  process.exit(1);
}

await app.register(cookie, { secret: env.SESSION_SECRET });
await app.register(multipart, { limits: { fileSize: DRAWING_MAX_BYTES, files: 1 } });
registerDrawingUpload(app);
registerReconcileUpload(app);
registerFirmLogoUpload(app);
registerMoodImageUpload(app);

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

app.get("/health", async () => ({ ok: true }));

// Liveness probe: checks all backing services are reachable.
app.get("/readyz", async (_req, reply) => {
  const checks = { db: false, redis: false, storage: false };
  try { await db.execute(sql`SELECT 1`); checks.db = true; } catch { /* intentional */ }
  try { await redis.ping(); checks.redis = true; } catch { /* intentional */ }
  try { await s3.bucketExists(BUCKET); checks.storage = true; } catch { /* intentional */ }
  const ok = checks.db && checks.redis && checks.storage;
  return reply.code(ok ? 200 : 503).send({ ok, checks });
});

const port = env.BACKEND_PORT;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`ESTI AORMS backend on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
