import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { PlatformRouter } from "@esti/backend/router";

/** Vanilla tRPC client (typed against the backend router). Cookies are sent so
 *  the platform-admin session authorizes the `admin.*` procedures. */
export const trpc = createTRPCClient<PlatformRouter>({
  links: [
    httpBatchLink({
      url: "/platform/trpc",
      fetch: (url, opts) => fetch(url, { ...opts, credentials: "include" }),
    }),
  ],
});
