import { expect, test } from "@playwright/test";

/**
 * Visual regression — the design-system gallery is the snapshot surface
 * (debt D2c). Public pages only (no auth): the /design-system specimens in all
 * three colour schemes, plus the marketing hero.
 *
 * Baselines: first run generates them (`pnpm exec playwright test
 * visual-regression --update-snapshots`); commit the `*-snapshots/` dir.
 * Deterministic rendering: CSS animations disabled per-assertion and
 * reduced-motion emulated (kills the contour drift + reveal transitions).
 */

test.use({ contextOptions: { reducedMotion: "reduce" } });

const SHOT = {
  fullPage: false,
  animations: "disabled" as const,
  // Glass blur + font AA vary slightly across GPUs — small tolerance.
  maxDiffPixelRatio: 0.02,
};

test.describe("design-system gallery", () => {
  test("layer map + tokens (top of page)", async ({ page }) => {
    await page.goto("/design-system");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("ds-top-light.png", SHOT);
  });

  test("scheme specimens — light · dark · high contrast", async ({ page }) => {
    await page.goto("/design-system");
    await page.waitForLoadState("networkidle");
    const section = page.locator("section", { has: page.locator("#schemes") });
    await section.scrollIntoViewIfNeeded();

    await expect(section).toHaveScreenshot("ds-scheme-light.png", SHOT);

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(section).toHaveScreenshot("ds-scheme-dark.png", SHOT);

    await page.getByRole("button", { name: "High Contrast" }).click();
    await expect(section).toHaveScreenshot("ds-scheme-high-contrast.png", SHOT);
  });

  test("primitives specimens (StatusDot · Avatar · orbs)", async ({ page }) => {
    await page.goto("/design-system");
    await page.waitForLoadState("networkidle");
    const section = page.locator("section", { has: page.locator("#components") });
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot("ds-primitives.png", SHOT);
  });
});

test.describe("marketing", () => {
  test("landing hero", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("landing-hero.png", SHOT);
  });
});
