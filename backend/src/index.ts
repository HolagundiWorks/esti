import cookie from "@fastify/cookie";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { env } from "./env.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";

const app = Fastify({ logger: true, genReqId: () => crypto.randomUUID() });

await app.register(cookie, { secret: env.SESSION_SECRET });

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
