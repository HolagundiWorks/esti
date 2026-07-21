import { test, expect } from "@playwright/test";
import { loginAs, isCrashed, waitForOfficeRoute } from "../fixtures/auth.js";
import { OFFICE_ROUTES } from "../utils/routes.js";

// "Every screen" — log in once, visit each office route, assert it renders
// without hitting the crash fallback and without being bounced to /login.
test("navigation sweep — every office screen renders", async ({ page }) => {
  test.setTimeout(180_000);
  await loginAs(page, "principal");

  const failures: string[] = [];
  for (const route of OFFICE_ROUTES) {
    await page.goto(route);
    await waitForOfficeRoute(page).catch(() => {});
    if (/\/login\b/.test(page.url())) {
      failures.push(`${route} (redirected to login)`);
      continue;
    }
    if (await isCrashed(page)) failures.push(`${route} (crashed/blank)`);
  }

  expect(failures, `routes that failed to render:\n${failures.join("\n")}`).toEqual([]);
});
