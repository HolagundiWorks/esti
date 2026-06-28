// Self-serve account creation. The licensing platform is now merged into AORMS
// (mounted under /platform), so the "Create free account" CTA hands off to the
// same-origin /platform/onboard endpoint, which signs the user in with Google,
// provisions a personal org + an AORMS trial licence, and redirects back with the
// key. Override the origin with VITE_LICENSE_PANEL_URL only if the platform is
// still deployed separately.
const PLATFORM_ORIGIN = (import.meta.env.VITE_LICENSE_PANEL_URL as string | undefined) ?? "";

export function createAccountUrl(product = "AORMS"): string {
  const base = PLATFORM_ORIGIN || window.location.origin;
  const url = new URL("/platform/onboard", base);
  url.searchParams.set("product", product);
  url.searchParams.set("return", window.location.origin);
  return url.toString();
}
