import { type Capability, can } from "@esti/contracts";
import type { AuthUser } from "./session.js";

export type UploadDenial = { status: 401 | 403; error: string };

/** Every binary upload route and the capability it must enforce. */
export const UPLOAD_ROUTE_CAPABILITIES = {
  "/upload/drawing": "write",
  "/upload/inspection-photo": "write",
  "/upload/reconcile": "write",
  "/upload/firm-logo": "firm:admin",
  "/upload/profile-photo": "write",
  "/upload/master-plan": "write",
  "/upload/standard-file": "write",
  "/upload/compliance-doc": "write",
} as const satisfies Record<string, Capability>;

/** Shared authorization policy for cookie-authenticated REST upload routes. */
export function uploadDenial(
  user: AuthUser | null,
  capability: Capability = "write",
): UploadDenial | null {
  if (!user) return { status: 401, error: "unauthenticated" };
  if (user.role === "CLIENT" || (user.role === "CONSULTANT" && user.consultantId)) {
    return { status: 403, error: "insufficient permission" };
  }
  if (!can(user.role, capability)) return { status: 403, error: "insufficient permission" };
  return null;
}
