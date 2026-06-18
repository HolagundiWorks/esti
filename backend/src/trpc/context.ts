import "@fastify/cookie"; // loads the FastifyReply.setCookie type augmentation
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { userFromDeviceToken } from "../auth/device.js";
import { SESSION_COOKIE, userFromToken, type AuthUser } from "../auth/session.js";
import { db } from "../db/index.js";
import { env } from "../env.js";

export interface Context {
  db: typeof db;
  user: AuthUser | null;
  /** Present when authenticated via ESTICAD device bearer token. */
  deviceSessionId: string | null;
  /** Client IP (honours the trusted proxy config) — used for login throttling. */
  ip: string;
  /** Fastify request ID, echoed from X-Request-Id if present (ADR O3). */
  requestId: string;
  setCookie: (name: string, value: string) => void;
}

function bearerToken(req: CreateFastifyContextOptions["req"]): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim() || undefined;
}

export async function createContext({ req, res }: CreateFastifyContextOptions): Promise<Context> {
  const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  let user = await userFromToken(cookieToken);
  let deviceSessionId: string | null = null;

  if (!user) {
    const deviceUser = await userFromDeviceToken(db, bearerToken(req));
    if (deviceUser) {
      user = deviceUser;
      deviceSessionId = deviceUser.deviceSessionId;
    }
  }

  return {
    db,
    user,
    deviceSessionId,
    ip: req.ip,
    requestId: String(req.id),
    setCookie: (name, value) =>
      void res.setCookie(name, value, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: env.COOKIE_SECURE,
      }),
  };
}
