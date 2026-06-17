import { type Capability, can } from "@esti/contracts";
import type { AuthUser } from "./session.js";

export type UploadDenial = { status: 401 | 403; error: string };

/** Every binary upload route and the capability it must enforce. */
export const UPLOAD_ROUTE_CAPABILITIES = {
  "/upload/drawing": "write",
  "/upload/mood-image": "write",
  "/upload/inspection-photo": "write",
  "/upload/reconcile": "write",
  "/upload/firm-logo": "firm:admin",
} as const satisfies Record<string, Capability>;

export type UploadDenialOptions = {
  /** Demo logins may upload drawings for takeoff demos; other routes stay blocked. */
  allowDemo?: boolean;
};

/** Shared authorization policy for cookie-authenticated REST upload routes. */
export function uploadDenial(
  user: AuthUser | null,
  capability: Capability = "write",
  opts?: UploadDenialOptions,
): UploadDenial | null {
  if (!user) return { status: 401, error: "unauthenticated" };
  if (user.isDemo && !opts?.allowDemo) {
    return { status: 403, error: "uploads are disabled on the demo account" };
  }
  if (user.role === "CLIENT" || (user.role === "CONSULTANT" && user.consultantId)) {
    return { status: 403, error: "insufficient permission" };
  }
  if (!can(user.role, capability)) return { status: 403, error: "insufficient permission" };
  return null;
}
