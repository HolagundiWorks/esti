import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";
import { createInModule } from "../fixtures/crud.js";

/**
 * Archive round-trip — create a client, search to isolate it, then deactivate it
 * (the CRM "archive a record" path; clients are soft-disabled, not hard-deleted).
 * The row's status flips Active → Deactivated.
 */
test.beforeEach(async ({ page }) => {
  await loginAs(page, "principal");
});

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

  // Deactivate lives in the row ⋯ menu (RowActionsMenu), not as a stage button.
  await row.getByRole("button", { name: /row actions/i }).click();
  await page.getByRole("menuitem", { name: /deactivate/i }).click();
  await expect(row, "client was not archived").toContainText("Deactivated", { timeout: 10_000 });
});
