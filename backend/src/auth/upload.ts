import { type Capability, can } from "@esti/contracts";
import type { AuthUser } from "./session.js";

export type UploadDenial = { status: 401 | 403; error: string };

/** Shared authorization policy for cookie-authenticated REST upload routes. */
export function uploadDenial(
  user: AuthUser | null,
  capability: Capability = "write",
): UploadDenial | null {
  if (!user) return { status: 401, error: "unauthenticated" };
  if (user.isDemo) return { status: 403, error: "uploads are disabled on the demo account" };
  if (user.role === "CLIENT" || (user.role === "CONSULTANT" && user.consultantId)) {
    return { status: 403, error: "insufficient permission" };
  }
  if (!can(user.role, capability)) return { status: 403, error: "insufficient permission" };
  return null;
}
