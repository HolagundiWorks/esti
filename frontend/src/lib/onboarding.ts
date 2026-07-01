// Self-serve account creation. The "Create account" CTA hands off to the firm
// app's own /login page (a "Create account" tab there, backed by the central
// licensing platform) — there is no separate account portal URL; only the
// /platform-admin licence console is a distinct surface. `mode=create` opens
// straight to that tab. Override the origin with VITE_LICENSE_PANEL_URL only if
// the platform is deployed on a different host.
const PLATFORM_ORIGIN = (import.meta.env.VITE_LICENSE_PANEL_URL as string | undefined) ?? "";

export function createAccountUrl(): string {
  const base = PLATFORM_ORIGIN || window.location.origin;
  const url = new URL("/login", base);
  url.searchParams.set("mode", "create");
  return url.toString();
}
