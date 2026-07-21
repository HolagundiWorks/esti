import { type Page, expect } from "@playwright/test";

/**
 * Demo personas seeded by `pnpm seed:demo` (see docs/esti/DEMO-AND-HR-MODE.md).
 * Login is email + password — the old "Choose a demo role" persona picker was
 * removed with the marketing/login consolidation.
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

/**
 * Sign in via the email/password form on `/login`. After credentials succeed the
 * page may show "Choose where to go" — click **Open workspace** to enter the
 * staff/portal shell. Resolves once `/login` is left.
 */
export async function loginAs(page: Page, persona: PersonaKey): Promise<void> {
  const p = PERSONAS[persona];
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible({
    timeout: 15_000,
  });
  await page.locator("#email").fill(p.email);
  await page.locator("#password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Post-auth chooser (workspace / account / company) — staff and client both
  // get "Open workspace" as the primary entry into the product shell.
  const openWorkspace = page.getByRole("button", { name: "Open workspace" });
  await expect(openWorkspace).toBeVisible({ timeout: 20_000 });
  await openWorkspace.click();

  await expect(page).not.toHaveURL(/\/login\b/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** True when the page shows the app's crash fallback (ErrorBoundary) or is blank. */
export async function isCrashed(page: Page): Promise<boolean> {
  const crash = await page
    .getByText(/something went wrong|unexpected error|application error/i)
    .count()
    .catch(() => 0);
  if (crash > 0) return true;
  const text = (await page.locator("body").innerText().catch(() => "")) ?? "";
  return text.trim().length === 0;
}
