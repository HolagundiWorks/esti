// Self-serve account creation. The "Create account" CTA hands off to the firm
// app's own /login page (a "Create account" tab there, backed by the central
// licensing platform) — there is no separate account portal URL; only the
// admin.DOMAIN licence console is a distinct surface. `mode=create` opens
// straight to that tab.
//
// VITE_ADMIN_URL  — full origin of the licensing console, e.g. https://admin.aorms.in
//                   (falls back to /login on the same origin for dev/self-hosted).
const ADMIN_ORIGIN = (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? "";

export function adminConsoleUrl(): string {
  return ADMIN_ORIGIN || window.location.origin.replace(/^\/\//, "//admin.");
}

export function createAccountUrl(): string {
  const base = ADMIN_ORIGIN || window.location.origin;
  const url = new URL("/login", base);
  url.searchParams.set("mode", "create");
  return url.toString();
}
