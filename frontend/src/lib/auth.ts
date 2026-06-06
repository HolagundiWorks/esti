import { trpc } from "./trpc.js";

/** Current session user (null when signed out). Drives app routing. */
export function useAuth() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  return { user: me.data ?? null, isLoading: me.isLoading };
}
