import { env } from "../env.js";

/**
 * Resolve the newest Estimate desktop installer from GitHub Releases.
 *
 * 2026-07 pivot: the Community appliance and full-desktop (Lite/Pro/Manager)
 * installers are retired. Only **AORMS Estimate** ships as a desktop app —
 * matched from `estimate-v*` releases by asset name.
 *
 * Public repo → unauthenticated (60/hr per IP); 30-minute in-memory cache.
 * Failures degrade to `null` so the download page shows "coming soon".
 */
export type DesktopInstallers = {
  /** AORMS Estimate standalone installer URL (AORMS-Estimate-Setup.exe). */
  estimate: string | null;
  version: string | null;
  publishedAt: string | null;
};

const EMPTY: DesktopInstallers = { estimate: null, version: null, publishedAt: null };
const TTL_MS = 30 * 60 * 1000;

let cache: { at: number; value: DesktopInstallers } | null = null;

type GhAsset   = { name: string; browser_download_url: string };
type GhRelease = { tag_name: string; published_at: string; draft: boolean; prerelease: boolean; assets: GhAsset[] };

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

  for (const r of releases) {
    if (r.draft || r.prerelease) continue;
    if (r.tag_name.startsWith("estimate-v")) {
      const url = pick(r.assets, /estimate/i);
      if (url) return { estimate: url, version: r.tag_name.replace(/^estimate-/, ""), publishedAt: r.published_at };
    }
  }
  return EMPTY;
}

/** Latest Estimate installer URL, cached. Never throws. */
export async function latestDesktopInstallers(): Promise<DesktopInstallers> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  try {
    const value = await fetchLatest();
    cache = { at: now, value };
    return value;
  } catch {
    return cache?.value ?? EMPTY;
  }
}
