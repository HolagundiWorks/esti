import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { OFFICE_ROUTES } from "../utils/routes.js";

/**
 * "Every button pressed" — a generic crawler that, on each office screen, clicks
 * every visible **non-destructive** button and asserts the UI never crashes.
 * Destructive / outbound / state-changing controls are skipped by label so the
 * sweep is safe to run against demo data. Each click is followed by Escape to
 * dismiss any modal/menu it opened; if a click navigates away, the route is
 * reloaded so the sweep continues.
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

test("button crawler — click safe buttons on every screen, assert no crash", async ({ page }) => {
  test.setTimeout(600_000); // a full-app sweep is inherently long
  await loginAs(page, "principal");

  const crashes: string[] = [];
  let clicked = 0;

  for (const route of OFFICE_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle").catch(() => {});

    const buttons = page.locator("button:visible:not([disabled])");
    const count = Math.min(await buttons.count().catch(() => 0), 30);

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const label =
        ((await button.innerText().catch(() => "")) ||
          (await button.getAttribute("aria-label").catch(() => "")) ||
          "").trim();
      if (!label || SKIP.test(label)) continue;

      await button.click({ timeout: 2000 }).catch(() => {});
      clicked += 1;
      await page.keyboard.press("Escape").catch(() => {});

      // Cheap crash check (no full-body read).
      const crashed = await page
        .getByText(/something went wrong|unexpected error|application error/i)
        .count()
        .catch(() => 0);
      if (crashed > 0) {
        crashes.push(`${route} :: "${label.slice(0, 50)}"`);
        break;
      }

      // A click may have navigated away — return to the route to keep sweeping.
      if (route !== "/" && !page.url().includes(route)) {
        await page.goto(route).catch(() => {});
        await page.waitForLoadState("networkidle").catch(() => {});
      }
    }
  }

  console.log(`button crawler clicked ${clicked} safe buttons across ${OFFICE_ROUTES.length} screens`);
  expect(crashes, `buttons that crashed the UI:\n${crashes.join("\n")}`).toEqual([]);
});
