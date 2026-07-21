import { expect, test } from "@playwright/test";

/**
 * Visual regression — public marketing surface only.
 *
 * The HCW-UI-Kit `/design-system` gallery was removed in the 2026-07 marketing
 * consolidation (single landing at `/`). Snapshots therefore cover the landing
 * hero — the one remaining public specimen the visual job can assert without
 * auth or a backend.
 *
 * Baselines are committed per-platform (`*-visual-{win32,linux}.png`). CI runs
 * the `visual` project inside the pinned Playwright image
 * (`mcr.microsoft.com/playwright:v1.49.0-jammy`, see `.github/workflows/ci.yml`)
 * so it matches the committed `-linux` baselines exactly. Regenerate after any
 * intended visual change:
 *   local:  pnpm exec playwright test visual-regression --update-snapshots
 *   linux:  docker run --rm --network host \
 *             -v "$PWD/e2e:/work" -w /work mcr.microsoft.com/playwright:v1.49.0-jammy \
 *             bash -lc 'npm ci && AORMS_BASE_URL=http://127.0.0.1:5173 \
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

test.describe("marketing", () => {
  test("landing hero", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Brand mark must be present — guards against a blank/error shell.
    await expect(page.getByText("AORMS").first()).toBeVisible();
    // Public pages must not surface API/offline toasts into the snapshot
    // (visual CI runs without a backend).
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    await expect(page).toHaveScreenshot("landing-hero.png", SHOT);
  });
});
