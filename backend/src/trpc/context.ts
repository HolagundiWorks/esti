import "@fastify/cookie"; // loads the FastifyReply.setCookie type augmentation
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { SESSION_COOKIE, userFromToken, type AuthUser } from "../auth/session.js";
import { db } from "../db/index.js";
import { env } from "../env.js";
import { isDemoAdminUnlocked } from "../lib/demoAdmin.js";
import { readSession as readPlatformSession } from "../licensing-platform/lib/session.js";

export interface Context {
  db: typeof db;
  user: AuthUser | null;
  /** Client IP (honours the trusted proxy config) — used for login throttling. */
  ip: string;
  /** Fastify request ID, echoed from X-Request-Id if present (ADR O3). */
  requestId: string;
  /** Opaque session cookie value when present (for logout revocation). */
  sessionToken: string | undefined;
  /** Demo session unlocked with DEMO_MASTER_PASSWORD — allows admin mutations. */
  demoAdminUnlocked: boolean;
  /** Signed-in platform (hlp) account, when an hlp_session cookie rides along —
   *  lets unified installs exchange a Google/platform sign-in for a workspace
   *  session (auth.sessionFromPlatform). */
  platformAccountId: string | null;
  setCookie: (name: string, value: string) => void;
}

export async function createContext({ req, res }: CreateFastifyContextOptions): Promise<Context> {
  const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  const user = await userFromToken(cookieToken);

  return {
    db,
    user,
    ip: req.ip,
    requestId: String(req.id),
    sessionToken: cookieToken,
    demoAdminUnlocked: isDemoAdminUnlocked(cookieToken),
    platformAccountId: readPlatformSession(req)?.accountId ?? null,
    setCookie: (name, value) =>
      void res.setCookie(name, value, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: env.COOKIE_SECURE,
      }),
  };
}
