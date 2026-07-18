/**
 * Optional privacy-conscious analytics (Plausible — no cookies).
 * Set VITE_PLAUSIBLE_DOMAIN at frontend build time (e.g. aorms.in).
 */

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

let initialized = false;

/** Load Plausible script once in production when domain is configured. */
export function initAnalytics(): void {
  if (initialized || import.meta.env.DEV || !PLAUSIBLE_DOMAIN) return;
  initialized = true;
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}

/** Track a custom event (CTA clicks, sign-up intent, etc.). */
export function trackEvent(name: string, props?: Record<string, string>): void {
  if (import.meta.env.DEV || !PLAUSIBLE_DOMAIN) return;
  window.plausible?.(name, props ? { props } : undefined);
}
