import { test, expect } from "@playwright/test";

/**
 * "Each measurement entered" — the deepest item-entry path: a BOQ line inside a
 * project's Costing window. Creates a fresh DRAFT estimate, enters a line's
 * quantity + rate, and asserts the system derives the amount (qty 10 × ₹100 =
 * ₹1,000) onto the BOQ line. Reaches the window via the URL-driven tab
 * (/projects/:id?tab=costing) where "Estimation & BOQ" is the default inner tab.
 * Reuses the saved session (crud project).
 */
test("estimate BOQ line — enter qty × rate, system derives the amount", async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const estTitle = `E2E est ${stamp}`;
  const lineDesc = `E2E line ${stamp}`;

  await page.goto("/projects");
  await page.waitForLoadState("networkidle").catch(() => {});
  const href = await page.locator('a[href^="/projects/"]').first().getAttribute("href").catch(() => "");
  expect(href, "no project available to open").toBeTruthy();
  await page.goto(`${(href ?? "").split("?")[0]}?tab=costing`);
  await page.waitForLoadState("networkidle").catch(() => {});

  // Fresh DRAFT estimate (it auto-opens on create).
  await page.getByRole("button", { name: /new estimate/i }).first().click();
  const estModal = page.getByRole("dialog").first();
  await expect(estModal).toBeVisible({ timeout: 8_000 });
  await estModal.locator("#ne-title").fill(estTitle);
  await estModal.getByRole("button", { name: /^create$/i }).click();
  await expect(estModal).toBeHidden({ timeout: 10_000 });

  // Add a BOQ line — enter qty + rate; the system derives the amount.
  await page.getByRole("button", { name: /add item/i }).first().click();
  const itemModal = page.getByRole("dialog").first();
  await expect(itemModal).toBeVisible({ timeout: 8_000 });
  await itemModal.locator("#it-desc").fill(lineDesc);
  await itemModal.locator("#it-unit").fill("cum");
  await itemModal.locator("#it-qty").fill("10");
  await itemModal.locator("#it-rate").fill("100");
  await itemModal.getByRole("button", { name: /^add$/i }).click();
  await expect(itemModal).toBeHidden({ timeout: 10_000 });

  // The fresh estimate had no other lines, so its derived total is exactly the
  // line we entered: qty 10 × ₹100 = ₹1,000. Asserting the total on the estimate
  // row proves the measurement was entered and the system derived the amount.
  const estRow = page.getByRole("row").filter({ hasText: estTitle }).first();
  await expect(estRow, "estimate row not found").toBeVisible({ timeout: 10_000 });
  await expect(estRow, "system did not derive qty × rate into the total").toContainText(/1,?000/);
});
