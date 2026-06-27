import { test, expect } from "@playwright/test";
import { PERSONAS, type PersonaKey, loginAs } from "../fixtures/auth.js";

// "All logins filled" — every demo persona signs in successfully.
for (const key of Object.keys(PERSONAS) as PersonaKey[]) {
  test(`login as ${key} (${PERSONAS[key].email})`, async ({ page }) => {
    await loginAs(page, key);
    await expect(page.getByText("Choose a demo role")).toHaveCount(0);
    await expect(page.locator("#root")).toBeVisible();
    // Landed somewhere inside the app, not bounced back to the login picker.
    expect(page.url()).not.toMatch(/\/login\b/);
  });
}
