import { trpc } from "./trpc.js";

/** Current session user (null when signed out). Drives app routing. */
export function useAuth() {
  // Session probe — 401 / offline / no-backend are all normal on public pages
  // (landing, login). Never toast; callers treat `user === null` as signed out.
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    meta: { silent: true },
  });
  return { user: me.data ?? null, isLoading: me.isLoading };
}
