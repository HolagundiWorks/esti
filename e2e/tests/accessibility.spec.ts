import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginAs, isCrashed } from "../fixtures/auth.js";

/** High-traffic routes for automated WCAG checks (critical + serious only). */
const AXE_ROUTES = ["/", "/projects", "/search", "/tasks", "/office/ai-studio"] as const;

test.describe("accessibility — axe", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "principal");
  });

  for (const route of AXE_ROUTES) {
    test(`no critical/serious violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});
      expect(await isCrashed(page), `${route} crashed before axe could run`).toBe(false);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(
        blocking,
        blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => n.target).join("\n")}`).join("\n\n"),
      ).toEqual([]);
    });
  }
});
