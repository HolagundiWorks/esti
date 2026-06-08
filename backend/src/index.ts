import { DRAWING_MAX_BYTES } from "@esti/contracts";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { runMigrations } from "./db/migrate.js";
import { env } from "./env.js";
import { registerDrawingUpload } from "./modules/drawing/upload.js";
import { registerFirmLogoUpload } from "./modules/firm/upload.js";
import { registerReconcileUpload } from "./modules/reconcile/upload.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

const app = Fastify({ logger: true, genReqId: () => crypto.randomUUID() });

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
