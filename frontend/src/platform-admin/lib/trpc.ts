import { createTRPCClient, httpBatchLink, type TRPCClient } from "@trpc/client";
import type { PlatformRouter } from "@esti/backend/router";

/** Vanilla tRPC client (typed against the backend router). Cookies are sent so
 *  the platform-admin session authorizes the `admin.*` procedures. The explicit
 *  annotation keeps the emitted type portable (TS2742 otherwise fails `tsc`
 *  under declaration-style checks — it broke the desktop CI build). */
export const trpc: TRPCClient<PlatformRouter> = createTRPCClient<PlatformRouter>({
  links: [
    httpBatchLink({
      url: "/platform/trpc",
      fetch: (url, opts) => fetch(url, { ...opts, credentials: "include" }),
    }),
  ],
});
