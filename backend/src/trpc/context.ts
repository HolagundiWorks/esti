import "@fastify/cookie"; // loads the FastifyReply.setCookie type augmentation
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "../db/index.js";
import { SESSION_COOKIE, userFromToken, type AuthUser } from "../auth/session.js";

export interface Context {
  db: typeof db;
  user: AuthUser | null;
  /** Client IP (honours the trusted proxy config) — used for login throttling. */
  ip: string;
  /** Fastify request ID, echoed from X-Request-Id if present (ADR O3). */
  requestId: string;
  setCookie: (name: string, value: string) => void;
}

export async function createContext({ req, res }: CreateFastifyContextOptions): Promise<Context> {
  const token = (req as { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE];
  const user = await userFromToken(token);
  return {
    db,
    user,
    ip: req.ip,
    requestId: String(req.id),
    setCookie: (name, value) => void res.setCookie(name, value, { httpOnly: true, sameSite: "strict", path: "/" }),
  };
}
