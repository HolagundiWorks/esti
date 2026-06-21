import {
  accessLevelForRole,
  can,
  externalClassForUser,
  type AccessLevel,
  type Capability,
} from "@esti/contracts";
import { useAuth } from "./auth.js";

export function useCapabilities() {
  const { user } = useAuth();
  const role = user?.role;
  const cap = (c: Capability) => can(role, c);
  const accessLevel: AccessLevel | null = user
    ? accessLevelForRole(user.role, user)
    : null;
  const isExternal = user ? externalClassForUser(user) != null : false;
  return {
    role,
    accessLevel,
    isExternal,
    canWrite: cap("write"),
    canInvoice: cap("invoice:manage"),
    canFees: cap("fees:manage"),
    canReports: cap("reports:view"),
    canProjectDelete: cap("project:delete"),
    canFirmAdmin: cap("firm:admin"),
    canHr: cap("hr:manage"),
    canSalary: cap("salary:view"),
    canTenders: cap("tenders:view"),
  };
}
