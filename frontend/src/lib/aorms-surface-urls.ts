/**
 * Frozen AORMS surface URLs — canonical host map (2026-07-11).
 * Docs: docs/esti/AORMS-SURFACE-URLS.md · keep in sync with product-nomenclature.ts.
 */
export const AORMS_DOMAIN = "aorms.in" as const;

export const AORMS_SURFACES = {
  /** Platform marketing — apex only. */
  platform: {
    id: "platform",
    label: "AORMS platform",
    host: `https://${AORMS_DOMAIN}`,
    hostnames: [AORMS_DOMAIN, `www.${AORMS_DOMAIN}`] as const,
  },
  /** AORMS-Studio staff workspace (architecture app). */
  studio: {
    id: "studio",
    label: "AORMS-Studio",
    host: `https://studio.${AORMS_DOMAIN}`,
    hostnames: [`studio.${AORMS_DOMAIN}`, `app.${AORMS_DOMAIN}`] as const,
    legacyRedirectFrom: [`app.${AORMS_DOMAIN}`] as const,
    loginPath: "/login",
  },
  /** AORMS-Consultancy marketing (engineering app — roadmap). */
  consultancy: {
    id: "consultancy",
    label: "AORMS-Consultancy",
    host: `https://consultancy.${AORMS_DOMAIN}`,
    hostnames: [`consultancy.${AORMS_DOMAIN}`] as const,
    marketingPath: "/",
  },
  /** Public documentation wiki. */
  wiki: {
    id: "wiki",
    label: "AORMS Wiki",
    host: `https://wiki.${AORMS_DOMAIN}`,
    hostnames: [`wiki.${AORMS_DOMAIN}`] as const,
    /** Wiki pages live at `/` on wiki host; `/wiki` remains on apex. */
    rootPath: "/",
    apexPath: "/wiki",
  },
  /** Knowledge Bank portal — EmOI textbook library (staff). */
  kbank: {
    id: "kbank",
    label: "Knowledge Bank portal",
    host: `https://kbank.${AORMS_DOMAIN}`,
    hostnames: [`kbank.${AORMS_DOMAIN}`] as const,
    homePath: "/libraries/knowledge-bank-portal",
  },
  /** Client, consultant, contractor & site portals. */
  external: {
    id: "external",
    label: "External portals",
    host: `https://external.${AORMS_DOMAIN}`,
    hostnames: [`external.${AORMS_DOMAIN}`] as const,
    loginPath: "/",
  },
  /** AORMS account & licensing hub (personal + company). */
  account: {
    id: "account",
    label: "AORMS account",
    host: `https://account.${AORMS_DOMAIN}`,
    hostnames: [`account.${AORMS_DOMAIN}`] as const,
    homePath: "/",
    companyPath: "/company-account",
  },
  /** HCW licensing console (platform admin). */
  admin: {
    id: "admin",
    label: "Licensing console",
    host: `https://admin.${AORMS_DOMAIN}`,
    hostnames: [`admin.${AORMS_DOMAIN}`] as const,
  },
} as const;

export type AormsSurfaceId = keyof typeof AORMS_SURFACES;

const HOST_TO_SURFACE = new Map<string, AormsSurfaceId>();
for (const [id, surface] of Object.entries(AORMS_SURFACES)) {
  for (const h of surface.hostnames) HOST_TO_SURFACE.set(h, id as AormsSurfaceId);
}

/** Resolve which frozen surface this hostname belongs to. */
export function detectSurface(hostname = typeof window !== "undefined" ? window.location.hostname : ""): AormsSurfaceId | "unknown" {
  const exact = HOST_TO_SURFACE.get(hostname);
  if (exact) return exact;
  if (/^admin\./.test(hostname)) return "admin";
  if (/^wiki\./.test(hostname)) return "wiki";
  return "unknown";
}

export function isWikiHost(hostname?: string): boolean {
  return detectSurface(hostname) === "wiki";
}

export function isStudioHost(hostname?: string): boolean {
  return detectSurface(hostname) === "studio";
}

export function isPlatformHost(hostname?: string): boolean {
  const s = detectSurface(hostname);
  return s === "platform" || s === "unknown";
}

export function isAdminHost(hostname?: string): boolean {
  return detectSurface(hostname) === "admin";
}

export function isAccountHost(hostname?: string): boolean {
  return detectSurface(hostname) === "account";
}

export function isExternalHost(hostname?: string): boolean {
  return detectSurface(hostname) === "external";
}

export function isKbankHost(hostname?: string): boolean {
  return detectSurface(hostname) === "kbank";
}

export function isConsultancyHost(hostname?: string): boolean {
  return detectSurface(hostname) === "consultancy";
}

/** Absolute URL for a surface + optional path. */
export function surfaceAbsoluteUrl(surfaceId: AormsSurfaceId, path = "/"): string {
  const base = AORMS_SURFACES[surfaceId].host.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? base : `${base}${p}`;
}

/** All production origins that must appear in ALLOWED_ORIGINS (cookie CSRF). */
export const AORMS_ALLOWED_ORIGINS = Object.values(AORMS_SURFACES).map((s) => s.host);

/** Comma-separated ALLOWED_ORIGINS value for deploy .env files. */
export const AORMS_ALLOWED_ORIGINS_CSV = AORMS_ALLOWED_ORIGINS.join(",");
