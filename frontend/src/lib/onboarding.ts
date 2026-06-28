// Self-serve account creation is handled by the Holagundi licensing cloud
// (the central account + licence system). The "Create free account" CTA hands
// off to its /onboard endpoint, which signs the user in with Google, provisions
// a personal org + an AORMS trial licence, and redirects back here with the key.
//
// Set VITE_LICENSE_PANEL_URL to the panel origin (dev: http://localhost:5180).
const PANEL_URL =
  (import.meta.env.VITE_LICENSE_PANEL_URL as string | undefined) ?? "https://panel.hcworks.in";

export function createAccountUrl(product = "AORMS"): string {
  const url = new URL("/onboard", PANEL_URL);
  url.searchParams.set("product", product);
  url.searchParams.set("return", window.location.origin);
  return url.toString();
}
