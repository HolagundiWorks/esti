import { DRAWING_MAX_BYTES } from "@esti/contracts";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { registerDrawingUpload } from "./modules/drawing/upload.js";
import { registerFirmLogoUpload } from "./modules/firm/upload.js";
import { registerReconcileUpload } from "./modules/reconcile/upload.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

// trustProxy lets req.ip reflect X-Forwarded-For behind the dev/prod proxy so
// per-IP rate limits key on the real client, not the proxy.
// maxParamLength is raised because tRPC batches the procedure list into the
// route param — the default of 100 chars 404s large batched GETs.
const app = Fastify({
  logger: true,
  genReqId: () => crypto.randomUUID(),
  trustProxy: true,
  maxParamLength: 5000,
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

await app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

app.get("/health", async () => ({ ok: true }));

const port = env.BACKEND_PORT;
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`ESTI AORMS backend on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
