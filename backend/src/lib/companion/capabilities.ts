import { can, parseAiSettings, type CompanionCapabilities } from "@esti/contracts";
import type { AuthUser } from "../../auth/session.js";
import type { DB } from "../../db/index.js";
import { getFirm } from "../firm.js";
import { getOrgSettings } from "../settings.js";

function isStaffWriteUser(user: AuthUser): boolean {
  if (user.role === "CLIENT") return false;
  if (user.role === "CONSULTANT" && user.consultantId) return false;
  return can(user.role, "write");
}

/** Resolve companion feature flags for ESTICAD sessions. */
export async function resolveCompanionCapabilities(
  db: DB,
  user: AuthUser,
): Promise<CompanionCapabilities> {
  const org = await getOrgSettings(db);
  const ai = parseAiSettings(org.aiSettings);
  const firm = await getFirm(db);
  const staffWrite = isStaffWriteUser(user);
  const subscriptionActive = staffWrite;

  return {
    takeoff: staffWrite && subscriptionActive,
    ai: staffWrite && ai.enabled && !user.isDemo,
    firmName: firm?.companyName ?? "AORMS",
    subscriptionActive,
  };
}
