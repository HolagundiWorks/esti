import { env } from "../env.js";

/**
 * Resolve the newest desktop installers by querying the GitHub Releases API for
 * the latest `desktop-v*` release and picking its assets by name.
 * Public repo → unauthenticated works (60/hr per IP); a 30-minute in-memory cache
 * keeps us far under that. Failures degrade to nulls so the /download page falls
 * back to "coming soon" rather than erroring.
 *
 * The `lite` field is the **free Community appliance** download — matched to the
 * `AORMS-Community-Setup.exe` asset the desktop CI publishes (it bundles Postgres
 * and runs offline out of the box; the earlier "downloads Postgres on first run"
 * caveat no longer applies). It is NOT the licence-gated Manager (`AORMS-Setup.exe`),
 * which must never be handed out as the free download. `pro` matches a `*pro*`
 * asset (none today — the Pro desktop app is disabled).
 */
export type DesktopInstallers = {
  version: string | null;
  publishedAt: string | null;
  /** Free Community appliance installer URL (AORMS-Community-Setup.exe). */
  lite: string | null;
  pro: string | null;
  /** Standalone Estimate desktop app (AORMS-Estimate-Setup.exe), from the newest
   *  `estimate-v*` release. Independent of the desktop-v* Community/Pro build. */
  estimate: string | null;
};

const EMPTY: DesktopInstallers = { version: null, publishedAt: null, lite: null, pro: null, estimate: null };
const TTL_MS = 30 * 60 * 1000;

let cache: { at: number; value: DesktopInstallers } | null = null;

type GhAsset = { name: string; browser_download_url: string };
type GhRelease = {
  tag_name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: GhAsset[];
};

function pick(assets: GhAsset[], re: RegExp): string | null {
  return assets.find((a) => re.test(a.name))?.browser_download_url ?? null;
}

async function fetchLatest(): Promise<DesktopInstallers> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "aorms-download-resolver",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(
    `https://api.github.com/repos/${env.INSTALLER_REPO}/releases?per_page=20`,
    { headers },
  );
  if (!res.ok) throw new Error(`GitHub releases API ${res.status}`);
  const releases = (await res.json()) as GhRelease[];

  // The desktop installers live in `desktop-v*` releases; the standalone Estimate
  // app in `estimate-v*` releases. They interleave, so scan for the newest of
  // each (the API returns releases newest-first).
  let desktop: Omit<DesktopInstallers, "estimate"> | null = null;
  let estimate: string | null = null;
  for (const r of releases) {
    if (r.draft) continue;
    if (!desktop && r.tag_name.startsWith("desktop-v")) {
      // Free download = the Community appliance. Match by name; accept a legacy
      // `*lite*` name too. Never the Manager (`AORMS-Setup.exe`).
      const lite = pick(r.assets, /community/i) ?? pick(r.assets, /lite/i);
      const pro = pick(r.assets, /pro/i);
      if (lite || pro)
        desktop = { version: r.tag_name.replace(/^desktop-/, ""), publishedAt: r.published_at, lite, pro };
    }
    if (!estimate && r.tag_name.startsWith("estimate-v")) {
      estimate = pick(r.assets, /estimate/i);
    }
    if (desktop && estimate) break;
  }
  if (!desktop && !estimate) return EMPTY;
  return {
    version: desktop?.version ?? null,
    publishedAt: desktop?.publishedAt ?? null,
    lite: desktop?.lite ?? null,
    pro: desktop?.pro ?? null,
    estimate,
  };
}

/** Latest Lite/Pro installer URLs, cached. Never throws. */
export async function latestDesktopInstallers(): Promise<DesktopInstallers> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  try {
    const value = await fetchLatest();
    cache = { at: now, value };
    return value;
  } catch {
    // Serve a stale cache if we have one; otherwise empty.
    return cache?.value ?? EMPTY;
  }
}
