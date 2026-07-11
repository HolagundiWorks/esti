import type { FastifyRequest } from "fastify";
import { env } from "../env.js";

function isLoopback(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip.startsWith("127.")
  );
}

/** Whether `/readyz` may be served to this caller (production hardening). */
export function readyzAllowed(req: FastifyRequest): boolean {
  if (env.NODE_ENV !== "production" || env.DESKTOP) return true;
  if (isLoopback(req.ip)) return true;
  const token = env.READYZ_PROBE_TOKEN;
  if (token && req.headers["x-readyz-token"] === token) return true;
  return false;
}
