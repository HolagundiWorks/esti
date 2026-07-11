// Self-serve account creation. The "Create account" CTA hands off to the AORMS
// account + licence portal at account.aorms.in (backed by the central licensing
// platform / hlp_account) — its own hub destination, distinct from the firm
// workspace /login. `mode=create` opens straight to the sign-up form.
//
// VITE_ADMIN_URL  — full origin of the licensing ADMIN console, e.g.
//                   https://admin.aorms.in (platform-admin realm only).
import { AORMS_PORTALS } from "./product-nomenclature.js";

const ADMIN_ORIGIN = (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? "";

export function adminConsoleUrl(): string {
  // Fallback derives admin.DOMAIN from the current origin (scheme kept).
  return ADMIN_ORIGIN || window.location.origin.replace(/^(https?:\/\/)/, "$1admin.");
}

export function createAccountUrl(): string {
  const base = AORMS_PORTALS.account.url.replace(/\/+$/, "");
  const url = new URL("/account", `${base}/`);
  url.searchParams.set("mode", "create");
  return url.toString();
}
