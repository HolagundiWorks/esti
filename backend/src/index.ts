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
import { INPROC_WORKER, redis } from "./lib/redis.js";
import { originDenial, parseAllowedOrigins } from "./lib/origin.js";
import {
  BUCKET,
  ensureBucketWithRetry,
  getObjectStream,
  storageHealthy,
} from "./lib/storage.js";
import { StorageQuotaExceededError } from "./lib/storageQuota.js";
import { isSmtpConfigured } from "./lib/mail/transport.js";
import { buildReleaseInfo, releaseSummary } from "./lib/releaseInfo.js";
import { registerDrawingUpload } from "./modules/drawing/upload.js";
import { registerFirmLogoUpload } from "./modules/firm/upload.js";
import { registerReconcileUpload } from "./modules/reconcile/upload.js";
import { registerInspectionPhotoUpload } from "./modules/inspection/upload.js";
import { registerMoodImageUpload } from "./modules/spec/upload.js";
import { registerProfilePhotoUpload } from "./modules/users/photoUpload.js";
import { registerHrDocUpload } from "./modules/team/hrDocUpload.js";
import { registerOnboardingDocUpload } from "./modules/projectos/upload.js";
import { registerCalendarFeed } from "./modules/calendar/feed.js";
import { registerLicenseRoutes } from "./modules/licensing/routes.js";
import { refreshNow } from "./modules/license/consumer.js";
import { applyFirmPlanFromEnv, licenseState } from "./lib/plan.js";
import { registerSyncRoutes } from "./modules/sync/routes.js";
import { drainOutbox } from "./lib/sync/outbox.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { userFromDeviceToken } from "./auth/device.js";
import { SESSION_COOKIE, userFromToken } from "./auth/session.js";
import { takeoffCatalogPayload } from "./modules/companion/router.js";

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

// Map storage-cap violations (thrown deep inside putObject) to HTTP 413 so the
// upload routes don't need per-route try/catch around storage writes.
app.setErrorHandler((err, _req, reply) => {
  if (err instanceof StorageQuotaExceededError) {
    return reply.code(413).send({ error: err.message });
  }
  app.log.error(err);
  const status = typeof err.statusCode === "number" ? err.statusCode : 500;
  return reply.code(status).send({ error: status === 500 ? "internal error" : err.message });
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

// Licence-free plan pin (desktop LITE / self-hosted firm). No-op when FIRM_PLAN unset.
try {
  await applyFirmPlanFromEnv(db);
} catch (err) {
  app.log.warn(err, "FIRM_PLAN apply failed");
}

// License (Phase B): log effective state on boot. On a managed node, refresh the
// signed token from the hub now and on an interval so the offline-grace window
// keeps extending while the hub is reachable (offline failures are tolerated).
try {
  const lic = await licenseState(db);
  app.log.info({ status: lic.status, plan: lic.plan, managed: lic.managed }, "license state");
} catch (err) {
  app.log.warn(err, "license state check failed");
}
if (env.ESTI_ROLE === "node" && env.ESTI_HUB_URL) {
  const refreshTick = async () => {
    try {
      app.log.info({ refreshed: await refreshNow(db) }, "license refresh");
    } catch (err) {
      app.log.warn(err, "license refresh failed");
    }
  };
  void refreshTick();
  setInterval(() => void refreshTick(), env.LICENSE_REFRESH_HOURS * 3600_000).unref();

  // Drain the publish outbox to the hub on boot + periodically (best-effort).
  const drainTick = async () => {
    try {
      const r = await drainOutbox(db);
      if (r.sent || r.failed) app.log.info(r, "sync outbox drained");
    } catch (err) {
      app.log.warn(err, "sync outbox drain failed");
    }
  };
  void drainTick();
  setInterval(() => void drainTick(), 60_000).unref();
}

if (isSmtpConfigured()) {
  app.log.info({ to: env.BETA_REQUEST_NOTIFY_TO }, "beta request mail enabled");
} else if (env.NODE_ENV === "production") {
  app.log.warn("SMTP not configured — beta request emails will not send (requests still saved)");
}

// Object storage backs file features (PDFs, drawings, uploads), but it must NOT
// gate the whole API: if MinIO/S3 is briefly unreachable we still want auth,
// dashboards and tRPC to serve. Provision the bucket in the background and retry;
// per-request upload code calls ensureBucket() again before writing, so files
// start working as soon as storage is reachable — no restart needed.
void ensureBucketWithRetry()
  .then(() => app.log.info({ bucket: BUCKET }, "object storage bucket ready"))
  .catch((err) =>
    app.log.error(err, "object storage not ready — file features will retry on use"),
  );

await app.register(cookie, { secret: env.SESSION_SECRET });

// Desktop auth: the Tauri webview's origin (tauri://localhost) is cross-origin to
// the loopback backend, so SameSite cookies aren't sent. The desktop SPA instead
// sends the session token as `Authorization: Bearer`. This shim (desktop only,
// runs after cookie parsing) copies it into the cookie slot so the tRPC context,
// every upload route, and the /files route resolve it via the unchanged cookie path.
if (env.DESKTOP) {
  app.addHook("onRequest", async (req) => {
    const h = req.headers.authorization;
    if (h?.startsWith("Bearer ")) {
      const token = h.slice(7).trim();
      const r = req as unknown as { cookies?: Record<string, string> };
      r.cookies = { ...(r.cookies ?? {}), [SESSION_COOKIE]: token };
    }
  });
}

await app.register(multipart, { limits: { fileSize: DRAWING_MAX_BYTES, files: 1 } });
registerDrawingUpload(app);
registerReconcileUpload(app);
registerFirmLogoUpload(app);
registerMoodImageUpload(app);
registerInspectionPhotoUpload(app);
registerProfilePhotoUpload(app);
registerHrDocUpload(app);
registerOnboardingDocUpload(app);
registerCalendarFeed(app);
// License authority + sync ingest REST — hub-only; no-op on node installs.
registerLicenseRoutes(app);
registerSyncRoutes(app);

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

/** ESTICAD REST surface — bearer or session cookie auth. */
app.get("/api/companion/takeoff-catalog", async (req, reply) => {
  const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  let user = await userFromToken(cookieToken);
  if (!user) {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
    user = await userFromDeviceToken(db, bearer);
  }
  if (!user) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
  if (user.role === "CLIENT" || (user.role === "CONSULTANT" && user.consultantId)) {
    return reply.code(403).send({ error: "Forbidden" });
  }
  return takeoffCatalogPayload();
});

// Serve filesystem-stored objects on desktop (STORAGE_DRIVER=fs). On S3 the SPA
// fetches presigned URLs directly from MinIO, so this route is only meaningful on
// desktop, but it's harmless to register either way. Auth: any signed-in user
// (matches presigned-URL semantics — anyone with the link can fetch).
const FILE_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".csv": "text/csv",
};
app.get("/files/*", async (req, reply) => {
  const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  const user = await userFromToken(cookieToken);
  if (!user) return reply.code(401).send({ error: "Unauthorized" });
  const key = (req.params as Record<string, string>)["*"];
  if (!key) return reply.code(400).send({ error: "missing key" });
  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  try {
    const stream = await getObjectStream(key);
    reply.header("Content-Type", FILE_MIME[ext] ?? "application/octet-stream");
    return reply.send(stream);
  } catch {
    return reply.code(404).send({ error: "not found" });
  }
});

app.get("/health", async () => {
  const info = await buildReleaseInfo(db);
  return releaseSummary(info);
});

// Liveness probe — checks only the backing services this deployment actually uses:
// DB always; Redis only when a real worker queue is wired (not desktop inproc);
// object storage via the active driver (S3 bucket or local fs root).
app.get("/readyz", async (_req, reply) => {
  const checks = { db: false, redis: true, storage: false };
  try { await db.execute(sql`SELECT 1`); checks.db = true; } catch { /* intentional */ }
  if (!INPROC_WORKER) {
    checks.redis = false;
    try { await redis.ping(); checks.redis = true; } catch { /* intentional */ }
  }
  try { checks.storage = await storageHealthy(); } catch { /* intentional */ }
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
