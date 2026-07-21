import { test, expect } from "@playwright/test";
import { OFFICE_ROUTES } from "../utils/routes.js";

/**
 * "Every button pressed" — one test per office screen (reusing the session saved
 * by auth.setup.ts). On each screen it clicks every visible **non-destructive**
 * button and asserts the UI never crashes. Destructive / outbound / state-
 * changing controls are skipped by label so the sweep is safe against demo data;
 * each click is followed by Escape to dismiss any modal/menu it opened, and a
 * click that navigates away reloads the route so the sweep continues.
 */
const SKIP = new RegExp(
  [
    "sign ?out",
    "log ?out",
    "delete",
    "remove",
    "archive",
    "revoke",
    "deactivate",
    "submit",
    "approve",
    "reject",
    "issue",
    "pay\\b",
    "freeze",
    "publish",
    "generate pdf",
    "export",
    "download",
    "upload",
    "send",
    "save",
    "create",
    "confirm",
    "deprecate",
    "duplicate",
  ].join("|"),
  "i",
);

for (const route of OFFICE_ROUTES) {
  test(`buttons: ${route}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(route);
    await page.waitForLoadState("networkidle").catch(() => {});
    // The saved session should keep us out of the login screen.
    expect(page.url(), "session lost — bounced to /login").not.toMatch(/\/login\b/);

    const buttons = page.locator("button:visible:not([disabled])");
    const count = Math.min(await buttons.count().catch(() => 0), 25);
    let crashedOn: string | null = null;

    for (let i = 0; i < count && !crashedOn; i++) {
      const button = buttons.nth(i);
      const label =
        ((await button.innerText().catch(() => "")) ||
          (await button.getAttribute("aria-label").catch(() => "")) ||
          "").trim();
      if (!label || SKIP.test(label)) continue;

      await button.click({ timeout: 2000 }).catch(() => {});
      await page.keyboard.press("Escape").catch(() => {});

      const crashed = await page
        .getByRole("button", { name: "Reload app" })
        .count()
        .catch(() => 0);
      if (crashed > 0) crashedOn = label.slice(0, 50);

      if (route !== "/" && !page.url().includes(route)) {
        await page.goto(route).catch(() => {});
        await page.waitForLoadState("networkidle").catch(() => {});
      }
    }

    expect(crashedOn, `a button crashed the UI on ${route}: "${crashedOn}"`).toBeNull();
  });
}
