import { test, expect } from "@playwright/test";
import { PERSONAS, type PersonaKey, loginAs } from "../fixtures/auth.js";

// Every seeded demo persona signs in via email/password + Open workspace.
for (const key of Object.keys(PERSONAS) as PersonaKey[]) {
  test(`login as ${key} (${PERSONAS[key].email})`, async ({ page }) => {
    await loginAs(page, key);
    await expect(page.locator("#root")).toBeVisible();
    expect(page.url()).not.toMatch(/\/login\b/);
  });
}
