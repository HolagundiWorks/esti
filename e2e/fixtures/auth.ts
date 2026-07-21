import { type Page, expect } from "@playwright/test";

/**
 * Demo personas seeded by `pnpm seed:demo` (see docs/esti/DEMO-AND-HR-MODE.md).
 * Login is email + password — the old "Choose a demo role" persona picker was
 * removed with the marketing/login consolidation.
 *
 * `portal: true` personas use `/access` (ExternalLogin) — they never see the
 * staff "Open workspace" chooser.
 */
export const PERSONAS = {
  principal: { email: "principal@demo.aorms.in", portal: false },
  lead: { email: "lead@demo.aorms.in", portal: false },
  site: { email: "site@demo.aorms.in", portal: false },
  junior: { email: "junior@demo.aorms.in", portal: false },
  client: { email: "client@demo.aorms.in", portal: true },
} as const;
export type PersonaKey = keyof typeof PERSONAS;

/** Default demo password (`SEED_DEMO_PASSWORD`, compose default `demo1234`). */
export const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

/** Wait until auth spinner is gone and a signed-in shell is on screen. */
export async function waitForSignedInShell(page: Page, portal = false): Promise<void> {
  await expect(page).not.toHaveURL(/\/(login|access)\b/, { timeout: 20_000 });
  // App.tsx shows a full-viewport CircularProgress while auth.me is pending.
  await expect(page.getByLabel(/^Loading /i)).toHaveCount(0, { timeout: 30_000 });
  if (portal) {
    // External portals render without the staff shell/footer.
    await expect(page.getByRole("heading", { name: /your projects/i })).toBeVisible({
      timeout: 30_000,
    });
  } else {
    await expect(
      page.locator(".esti-app-shell2, .esti-app-footer").first(),
    ).toBeVisible({ timeout: 30_000 });
  }
  await page.waitForLoadState("networkidle").catch(() => {});
}

/**
 * After a full `page.goto` the SPA remounts and auth.me shows a blank spinner.
 * Call this before crash/axe assertions so we don't false-positive on loading.
 */
export async function waitForOfficeRoute(page: Page): Promise<void> {
  await expect(page.getByLabel(/^Loading /i)).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.locator(".esti-app-shell2, .esti-app-footer").first(),
  ).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/**
 * Sign in via email/password. Staff use `/login` + **Open workspace**; portal
 * personas use `/access` (no chooser). Resolves once the product shell is up.
 */
export async function loginAs(page: Page, persona: PersonaKey): Promise<void> {
  const p = PERSONAS[persona];

  if (p.portal) {
    await page.goto("/access");
    await expect(page.locator("#access-email")).toBeVisible({ timeout: 15_000 });
    await page.locator("#access-email").fill(p.email);
    await page.locator("#access-password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: /^(Sign in|Verify)$/ }).click();
    await waitForSignedInShell(page, true);
    return;
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#email").fill(p.email);
  await page.locator("#password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Post-auth chooser (workspace / account / company).
  const openWorkspace = page.getByRole("button", { name: "Open workspace" });
  await expect(openWorkspace).toBeVisible({ timeout: 20_000 });
  await openWorkspace.click();

  await waitForSignedInShell(page, false);
}

/**
 * True when the top-level ErrorBoundary recovery UI is showing.
 * Do **not** match toast titles — `main.tsx` defaults failed queries to
 * "Something went wrong", which is recoverable chrome, not a crash.
 * Call {@link waitForOfficeRoute} first after a full navigation.
 *
 * Empty `#root` alone is **not** a crash while the auth/Suspense spinner is
 * up (capability-gated routes like `/hr` can sit on that spinner longer for
 * lower personas and used to false-positive the persona nav sweep).
 */
export async function isCrashed(page: Page): Promise<boolean> {
  const reload = await page
    .getByRole("button", { name: "Reload app" })
    .count()
    .catch(() => 0);
  if (reload > 0) return true;
  const loading = await page.getByLabel(/^Loading /i).count().catch(() => 0);
  if (loading > 0) return false;
  const text = (await page.locator("#root").innerText().catch(() => "")) ?? "";
  return text.trim().length === 0;
}
