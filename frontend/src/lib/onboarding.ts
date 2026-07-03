// Self-serve account creation. The "Create account" CTA hands off to the AORMS
// account + licence portal at /account (backed by the central licensing
// platform / hlp_account) — its own hub destination, distinct from the firm
// workspace /login. `mode=create` opens straight to the sign-up form.
//
// VITE_ADMIN_URL  — full origin of the licensing ADMIN console, e.g.
//                   https://admin.aorms.in (platform-admin realm only).
const ADMIN_ORIGIN = (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? "";

export function adminConsoleUrl(): string {
  // Fallback derives admin.DOMAIN from the current origin (scheme kept).
  return ADMIN_ORIGIN || window.location.origin.replace(/^(https?:\/\/)/, "$1admin.");
}

export function createAccountUrl(): string {
  // Always the MAIN origin: the customer account portal is the product SPA's
  // /account route. The admin console (VITE_ADMIN_URL) is the platform-admin
  // realm — its self-signup is locked once an admin exists, so sending
  // sign-ups there dead-ends on "registration closed".
  const url = new URL("/account", window.location.origin);
  url.searchParams.set("mode", "create");
  return url.toString();
}
