// Self-serve account creation. The "Create account" CTA now hands off to the
// customer account portal at /account (separate from the /platform-admin licence
// console): create an account and request a workspace, which an admin fulfils and
// emails. Override the origin with VITE_LICENSE_PANEL_URL only if the platform is
// deployed on a different host.
const PLATFORM_ORIGIN = (import.meta.env.VITE_LICENSE_PANEL_URL as string | undefined) ?? "";

export function createAccountUrl(): string {
  const base = PLATFORM_ORIGIN || window.location.origin;
  return new URL("/account", base).toString();
}
