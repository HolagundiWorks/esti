import { test, expect } from "@playwright/test";
import { createInModule } from "../fixtures/crud.js";

/**
 * Edit + delete round-trip with re-derivation — the full lifecycle of a BOQ line
 * inside a project's Costing window. Create a DRAFT estimate, add a line
 * (qty 10 × ₹100 = ₹1,000), EDIT the quantity to 20 (the total re-derives to
 * ₹2,000 on blur), then DELETE the line (the total returns to ₹0). Self-contained
 * on a throwaway estimate, so it never touches data other tests rely on. Reuses
 * the saved session (crud project).
 */
test("estimate line — create, edit qty (re-derives), delete", async ({ page }) => {
  test.setTimeout(90_000);
  const stamp = Date.now();
  const estTitle = `E2E life ${stamp}`;

  await page.goto("/projects");
  await page.waitForLoadState("networkidle").catch(() => {});
  const href = await page.locator('a[href^="/projects/"]').first().getAttribute("href").catch(() => "");
  await page.goto(`${(href ?? "").split("?")[0]}?tab=costing`);
  await page.waitForLoadState("networkidle").catch(() => {});

  // Create + auto-open a DRAFT estimate.
  await page.getByRole("button", { name: /new estimate/i }).first().click();
  const estModal = page.getByRole("dialog").first();
  await expect(estModal).toBeVisible({ timeout: 8_000 });
  await estModal.locator("#ne-title").fill(estTitle);
  await estModal.getByRole("button", { name: /^create$/i }).click();
  await expect(estModal).toBeHidden({ timeout: 10_000 });

  // Add a line.
  await page.getByRole("button", { name: /add item/i }).first().click();
  const itemModal = page.getByRole("dialog").first();
  await expect(itemModal).toBeVisible({ timeout: 8_000 });
  await itemModal.locator("#it-desc").fill(`E2E line ${stamp}`);
  await itemModal.locator("#it-unit").fill("cum");
  await itemModal.locator("#it-qty").fill("10");
  await itemModal.locator("#it-rate").fill("100");
  await itemModal.getByRole("button", { name: /^add$/i }).click();
  await expect(itemModal).toBeHidden({ timeout: 10_000 });

  const estRow = page.getByRole("row").filter({ hasText: estTitle }).first();
  await expect(estRow, "create did not derive ₹1,000").toContainText(/1,?000/, { timeout: 10_000 });

  // EDIT — change qty 10 → 20; the inline cell commits on blur and the total
  // re-derives to ₹2,000.
  const qtyInput = page.locator('input[id^="qty-"]').first();
  await expect(qtyInput).toBeVisible({ timeout: 10_000 });
  await qtyInput.fill("20");
  await qtyInput.blur();
  await expect(estRow, "total did not re-derive after edit").toContainText(/2,?000/, { timeout: 10_000 });

  // DELETE — remove the line; the estimate total returns to ₹0.00.
  await page.getByRole("button", { name: /^remove$/i }).first().click();
  await expect(page.locator('input[id^="qty-"]'), "line was not removed").toHaveCount(0, { timeout: 10_000 });
  await expect(estRow, "total did not reset after delete").toContainText(/0\.00/, { timeout: 10_000 });
});

/**
 * Archive round-trip — create a client, search to isolate it, then deactivate it
 * (the CRM "archive a record" path; clients are soft-disabled, not hard-deleted).
 * The row's status flips Active → Deactivated.
 */
test("client — create then deactivate (archive)", async ({ page }) => {
  test.setTimeout(60_000);
  const name = `E2E archive ${Date.now()}`;

  // Create (reusing the CRUD form-filler) — leaves us on /clients with it listed.
  await createInModule(page, { route: "/clients", open: /new client/i, submit: /^create$/i, token: name });

  // Isolate it via the table search.
  await page.getByPlaceholder(/search clients/i).fill(name);
  await page.waitForTimeout(800);

  const row = page.getByRole("row").filter({ hasText: name }).first();
  await expect(row, "created client not found").toBeVisible({ timeout: 10_000 });
  await expect(row, "new client should start Active").toContainText("Active");

  await row.getByRole("button", { name: /deactivate/i }).click();
  await expect(row, "client was not archived").toContainText("Deactivated", { timeout: 10_000 });
});
