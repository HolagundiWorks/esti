import { test as setup } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";

/** Sign in once as the principal and persist the session so the button crawler
 *  (one test per route) can reuse it instead of logging in 33 times. */
setup("authenticate as principal", async ({ page }) => {
  await loginAs(page, "principal");
  await page.context().storageState({ path: ".auth/principal.json" });
});
