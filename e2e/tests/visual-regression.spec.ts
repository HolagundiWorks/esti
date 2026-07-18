import { expect, test } from "@playwright/test";

/**
 * Visual regression — the design-system gallery is the snapshot surface
 * (debt D2c). Public pages only (no auth): the /design-system specimens in all
 * three colour schemes, plus the marketing hero.
 *
 * Baselines are committed per-platform (`*-visual-{win32,linux}.png`). CI runs
 * the `visual` project inside the pinned Playwright image
 * (`mcr.microsoft.com/playwright:v1.49.0-jammy`, see `.github/workflows/ci.yml`)
 * so it matches the committed `-linux` baselines exactly. Regenerate after any
 * intended visual change:
 *   local:  pnpm exec playwright test visual-regression --update-snapshots
 *   linux:  docker run --rm --add-host=host.docker.internal:host-gateway \
 *             -v "$PWD/e2e:/work" -w /work mcr.microsoft.com/playwright:v1.49.0-jammy \
 *             bash -lc 'npm ci && AORMS_BASE_URL=http://host.docker.internal:5173 \
 *               npx playwright test visual-regression --update-snapshots'
 *   (bump the image tag AND regenerate together.)
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
