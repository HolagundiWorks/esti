import { can, type Capability } from "@esti/contracts";
import { useAuth } from "./auth.js";

export function useCapabilities() {
  const { user } = useAuth();
  const role = user?.role;
  const cap = (c: Capability) => can(role, c);
  return {
    role,
    canWrite: cap("write"),
    canInvoice: cap("invoice:manage"),
    canFees: cap("fees:manage"),
    canReports: cap("reports:view"),
    canProjectDelete: cap("project:delete"),
    canFirmAdmin: cap("firm:admin"),
    canHr: cap("hr:manage"),
  };
}
