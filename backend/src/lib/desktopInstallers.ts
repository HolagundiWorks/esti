import { env } from "../env.js";

/**
 * Resolve the newest desktop installers by querying the GitHub Releases API for
 * the latest `desktop-v*` release and picking its Lite / Pro assets by name.
 * Public repo → unauthenticated works (60/hr per IP); a 30-minute in-memory cache
 * keeps us far under that. Failures degrade to nulls so the /download page falls
 * back to "coming soon" rather than erroring.
 *
 * Matching is by asset NAME (`/lite/i`, `/pro/i`), so a release is only surfaced
 * once it publishes correctly-named installers — the legacy `AORMS-Setup.exe` /
 * `AORMS-Community-Setup.exe` assets (which download Postgres on first run) are
 * intentionally NOT matched.
 */
export type DesktopInstallers = {
  version: string | null;
  publishedAt: string | null;
  lite: string | null;
  pro: string | null;
};

const EMPTY: DesktopInstallers = { version: null, publishedAt: null, lite: null, pro: null };
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

  // Newest published, non-draft desktop-v* release that actually carries a
  // Lite or Pro installer. The API returns releases newest-first.
  for (const r of releases) {
    if (r.draft || !r.tag_name.startsWith("desktop-v")) continue;
    const lite = pick(r.assets, /lite/i);
    const pro = pick(r.assets, /pro/i);
    if (lite || pro) {
      return { version: r.tag_name.replace(/^desktop-/, ""), publishedAt: r.published_at, lite, pro };
    }
  }
  return EMPTY;
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
