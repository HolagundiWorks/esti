import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerV1Routes } from "./routes/v1.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/trpc.js";

/** tRPC router type for the merged licensing platform (frontend admin client). */
export type PlatformRouter = typeof appRouter;

/**
 * Mount the merged Holagundi licensing platform under `/platform` on the AORMS
 * Fastify app: `/platform/auth/*`, `/platform/onboard`, `/platform/v1/*`, and a
 * separate tRPC at `/platform/trpc`. It uses its own Google session cookie
 * (`hlp_session`), distinct from AORMS's firm session. `@fastify/cookie` must be
 * registered on the app before this runs.
 */
export async function registerLicensingPlatform(app: FastifyInstance): Promise<void> {
  await app.register(
    async (scope) => {
      registerAuthRoutes(scope);
      registerV1Routes(scope);
      await scope.register(fastifyTRPCPlugin, {
        prefix: "/trpc",
        trpcOptions: { router: appRouter, createContext },
      });
    },
    { prefix: "/platform" },
  );
}
