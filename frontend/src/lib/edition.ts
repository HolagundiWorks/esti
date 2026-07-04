import { trpc } from "./trpc.js";

/**
 * Product edition, server-authoritative (auth.runtime). COMMUNITY = the free,
 * offline LAN appliance — no licence, no online account, no AI, no external
 * portals. The SPA branches on `community` to strip those surfaces.
 */
export function useEdition() {
  const q = trpc.auth.runtime.useQuery(undefined, { staleTime: Infinity });
  return {
    community: q.data?.community ?? false,
    edition: q.data?.edition ?? "STANDARD",
    loaded: q.isSuccess,
  };
}
