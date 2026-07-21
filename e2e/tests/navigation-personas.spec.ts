import { test, expect } from "@playwright/test";
import { loginAs, isCrashed, waitForOfficeRoute } from "../fixtures/auth.js";
import { OFFICE_ROUTES } from "../utils/routes.js";

/**
 * Per-persona stability sweep — the principal sweep lives in navigation.spec; this
 * asserts the *other* office roles (Project Lead, Jr Architect) never crash on any
 * office screen (role-gated screens may redirect, but must not blow up), and that
 * the client portal persona reaches the portal cleanly.
 */
for (const persona of ["lead", "junior"] as const) {
  test(`navigation (${persona}) — office routes never crash`, async ({ page }) => {
    test.setTimeout(180_000);
    await loginAs(page, persona);

    const crashes: string[] = [];
    for (const route of OFFICE_ROUTES) {
      await page.goto(route);
      await waitForOfficeRoute(page).catch(() => {});
      expect(page.url(), `${persona} bounced to /login at ${route}`).not.toMatch(/\/login\b/);
      if (await isCrashed(page)) crashes.push(route);
    }
    expect(crashes, `${persona} crashed on:\n${crashes.join("\n")}`).toEqual([]);
  });
}

for (const persona of ["client"] as const) {
  test(`portal (${persona}) — signs in and renders without crash`, async ({ page }) => {
    await loginAs(page, persona);
    expect(page.url(), `${persona} stuck on /login`).not.toMatch(/\/(login|access)\b/);
    expect(await isCrashed(page), `${persona} portal crashed`).toBe(false);
  });
}
