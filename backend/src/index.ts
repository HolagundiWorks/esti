import { DRAWING_MAX_BYTES } from "@esti/contracts";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { ensureCriticalSchema } from "./db/ensureCriticalSchema.js";
import { env } from "./env.js";
import { redis } from "./lib/redis.js";
import {
  corsAllowOrigin,
  isMachineAuthRoute,
  originDenial,
  parseAllowedOrigins,
} from "./lib/origin.js";
import {
  BUCKET,
  ensureBucketWithRetry,
  getObjectStream,
  storageHealthy,
} from "./lib/storage.js";
import { canAccessStorageKey, isSafeStorageKey } from "./lib/storageAccess.js";
import { readyzAllowed } from "./lib/internalProbe.js";
import { StorageQuotaExceededError } from "./lib/storageQuota.js";
import { isSmtpConfigured } from "./lib/mail/transport.js";
import { buildReleaseInfo, releaseSummary } from "./lib/releaseInfo.js";
import { registerDrawingUpload } from "./modules/drawing/upload.js";
import { registerFirmLogoUpload } from "./modules/firm/upload.js";
import { registerReconcileUpload } from "./modules/reconcile/upload.js";
import { registerInspectionPhotoUpload } from "./modules/inspection/upload.js";
import { registerComplianceDocUpload } from "./modules/compliance/upload.js";
import { registerMasterPlanUpload } from "./modules/masterplan/upload.js";
import { registerStandardFileUpload } from "./modules/standards/upload.js";
import { registerRepoTextbookUpload } from "./modules/repository/upload.js";
import { registerProfilePhotoUpload } from "./modules/users/photoUpload.js";
import { registerHrDocUpload } from "./modules/team/hrDocUpload.js";
import { registerOnboardingDocUpload } from "./modules/projectos/upload.js";
import { registerCalendarFeed } from "./modules/calendar/feed.js";
import { registerLicenseRoutes } from "./modules/licensing/routes.js";
import { refreshNow } from "./modules/license/consumer.js";
import { applyFirmPlanFromEnv, licenseState } from "./lib/plan.js";
import {
  checkOllamaHealth,
  ensureOllamaAiSettings,
  ollamaBaseUrlFromEnv,
  ollamaModelFromEnv,
} from "./lib/ai/ollama-config.js";
import { registerSyncRoutes } from "./modules/sync/routes.js";
import { drainOutbox } from "./lib/sync/outbox.js";
import { proposePulseActions, runDueStandups } from "./lib/pulseEngine.js";
import { tickDemoMidnightReset } from "./lib/demoReset.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { registerLicensingPlatform } from "./licensing-platform/register.js";
import { SESSION_COOKIE, userFromToken } from "./auth/session.js";

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
  const e = err as { statusCode?: unknown; message?: unknown };
  const status = typeof e.statusCode === "number" ? e.statusCode : 500;
  const message = typeof e.message === "string" ? e.message : "internal error";
  return reply.code(status).send({ error: status === 500 ? "internal error" : message });
});

const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

app.addHook("onRequest", (req, reply, done) => {
  const denial = originDenial(
    req.method,
    req.headers.origin,
    allowedOrigins,
    Boolean(req.headers.authorization) && isMachineAuthRoute(req.url),
  );
  if (denial) {
    void reply.code(403).send({ error: denial });
    return;
  }
  // CORS for trusted cross-origin clients (separate SPA origins).
  // Same-origin web/VPS traffic sends no Origin, so this is inert.
  const allowOrigin = corsAllowOrigin(req.headers.origin, allowedOrigins);
  if (allowOrigin) {
    reply
      .header("access-control-allow-origin", allowOrigin)
      .header("access-control-allow-credentials", "true")
      .header("vary", "Origin");
    if (req.method === "OPTIONS") {
      // Reflect the browser's requested headers so anything the SPA attaches
      // (content-type, authorization, x-request-id) clears preflight — the origin
      // is already allow-listed above. Fall back to the known set when absent.
      const reqHeaders = req.headers["access-control-request-headers"];
      void reply
        .header("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
        .header(
          "access-control-allow-headers",
          typeof reqHeaders === "string" && reqHeaders.length > 0
            ? reqHeaders
            : "content-type,authorization,x-request-id",
        )
        .header("access-control-max-age", "600")
        .code(204)
        .send();
      return;
    }
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
  await ensureCriticalSchema(db);
  app.log.info("migrations applied");
} catch (err) {
  app.log.error(err, "migration failed");
  process.exit(1);
}

// Licence-free plan pin for self-hosted VPS installs. No-op when FIRM_PLAN unset.
try {
  await applyFirmPlanFromEnv(db);
} catch (err) {
  app.log.warn(err, "FIRM_PLAN apply failed");
}

// AI Studio — point org settings at the compose Ollama service and log readiness.
try {
  const ai = await ensureOllamaAiSettings(db);
  const baseUrl = ai.ollamaBaseUrl ?? ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  const health = await checkOllamaHealth({ baseUrl, model });
  if (!health.ok) {
    app.log.warn(
      { baseUrl, model, error: health.error, modelsAvailable: health.modelsAvailable },
      `Ollama not ready — pull the model: docker exec esti-ollama ollama pull ${model}`,
    );
  } else {
    app.log.info({ baseUrl, model, modelsAvailable: health.modelsAvailable }, "Ollama ready for AI Studio");
  }
} catch (err) {
  app.log.warn(err, "Ollama AI settings bootstrap failed");
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

// ESTI Pulse — best-effort standup scheduler (server-local time). Checks every
// 5 minutes whether one of the four default cycles (09/12/15/18) is due and,
// if so, runs it once per active project per day. See docs/esti/ESTI-PULSE.md.
const standupTick = async () => {
  try {
    const r = await runDueStandups(db);
    if (r.triggered) app.log.info(r, "pulse standup cycle triggered");
  } catch (err) {
    app.log.warn(err, "pulse standup scheduler failed");
  }
};
setInterval(() => void standupTick(), 5 * 60_000).unref();

// ESTI Pulse — approval-based action agent (Module 8 Stage 3). Every 30
// minutes, propose escalations for overdue standup questions and follow-up
// tasks for BLOCKED/NEEDS_REVIEW answers. Proposals only — nothing here
// writes to a task or question without a human approving via pulse.actions.decide.
const pulseActionsTick = async () => {
  try {
    const r = await proposePulseActions(db);
    if (r.escalationsProposed || r.followupsProposed) app.log.info(r, "pulse actions proposed");
  } catch (err) {
    app.log.warn(err, "pulse action proposal sweep failed");
  }
};
setInterval(() => void pulseActionsTick(), 30 * 60_000).unref();

const demoResetTick = () => void tickDemoMidnightReset(app.log).catch((err) => {
  app.log.warn(err, "demo midnight reset failed");
});
setInterval(demoResetTick, 60_000).unref();

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

await app.register(multipart, { limits: { fileSize: DRAWING_MAX_BYTES, files: 1 } });
registerDrawingUpload(app);
registerReconcileUpload(app);
registerFirmLogoUpload(app);
registerInspectionPhotoUpload(app);
registerComplianceDocUpload(app);
registerMasterPlanUpload(app);
registerStandardFileUpload(app);
registerRepoTextbookUpload(app);
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

// Merged Holagundi licensing platform: /platform/auth/*, /platform/onboard,
// /platform/v1/*, and its own tRPC at /platform/trpc (separate Google session).
await registerLicensingPlatform(app);

// Serve filesystem-stored objects when STORAGE_DRIVER=fs. On S3 the SPA fetches
// presigned URLs directly from MinIO, so this route is inert there, but it is
// harmless to register either way. Auth: signed-in user with firm- or
// portal-scoped key ownership (see storageAccess.ts).
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
  if (!key || !isSafeStorageKey(key)) return reply.code(400).send({ error: "missing key" });
  if (!(await canAccessStorageKey(db, user, key))) {
    return reply.code(403).send({ error: "Forbidden" });
  }
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

// Liveness probe — checks the backing services this deployment uses:
// DB, Redis (Python worker job stream), and object storage via the active
// driver (S3 bucket or local fs root).
app.get("/readyz", async (req, reply) => {
  if (!readyzAllowed(req)) {
    return reply.code(403).send({ error: "forbidden" });
  }
  const checks = { db: false, redis: false, storage: false };
  try { await db.execute(sql`SELECT 1`); checks.db = true; } catch { /* intentional */ }
  try { await redis.ping(); checks.redis = true; } catch { /* intentional */ }
  try { checks.storage = await storageHealthy(); } catch { /* intentional */ }
  const ok = checks.db && checks.redis && checks.storage;
  return reply.code(ok ? 200 : 503).send({ ok, checks });
});

const port = env.BACKEND_PORT;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`ESTI AORMS backend on :${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
