import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerGoogleRoutes } from "./routes/google.js";
import { registerV1Routes } from "./routes/v1.js";
import { appRouter } from "./trpc/router.js";
import { createContext } from "./trpc/trpc.js";

/** tRPC router type for the merged licensing platform (frontend admin client). */
export type PlatformRouter = typeof appRouter;

/**
 * Mount the in-tree HCW License Manager under `/platform` on the AORMS Fastify
 * app: `/platform/auth/*`, `/platform/onboard`, `/platform/v1/*`, and admin tRPC
 * at `/platform/trpc`. Uses its own session cookie (`hlp_session`), distinct
 * from the firm session. `@fastify/cookie` must be registered before this runs.
 * Docs: docs/esti/HCW-LICENSE-MANAGER.md.
 */
export async function registerLicensingPlatform(app: FastifyInstance): Promise<void> {
  await app.register(
    async (scope) => {
      registerAuthRoutes(scope);
      registerGoogleRoutes(scope);
      registerV1Routes(scope);
      await scope.register(fastifyTRPCPlugin, {
        prefix: "/trpc",
        trpcOptions: { router: appRouter, createContext },
      });
    },
    { prefix: "/platform" },
  );
}
