import { type Page, expect } from "@playwright/test";

/** Pick a sensible value for a form field from its id/type (so India-validated
 *  fields like GSTIN/PAN/phone don't block submit). The first input is the
 *  record's name and gets the unique token. */
function fillerFor(id: string, type: string | null, isFirst: boolean, token: string): string {
  if (isFirst) return token;
  const k = (id || "").toLowerCase();
  if (type === "email" || k.includes("email")) return "e2e@test.aorms.in";
  if (k.includes("phone") || k.includes("mobile") || k.includes("contact")) return "9999999999";
  if (k.includes("gstin")) return "29ABCDE1234F1Z5";
  if (k.includes("pan")) return "ABCDE1234F";
  return "E2E";
}

/**
 * Open a module's create modal, fill every field generically (name → token,
 * email/phone/GSTIN/PAN by id, native selects → last option, textareas → note),
 * submit, and assert the new record's unique token appears in the list. This is
 * the "each item entered" coverage — a real create round-trip per module.
 */
export async function createInModule(
  page: Page,
  opts: { route: string; open: RegExp; submit: RegExp; token: string },
): Promise<void> {
  await page.goto(opts.route);
  await page.waitForLoadState("networkidle").catch(() => {});

  const newBtn = page.getByRole("button", { name: opts.open }).first();
  await expect(newBtn, `no "${opts.open}" button on ${opts.route}`).toBeVisible({ timeout: 10_000 });
  await newBtn.click();

  const dialog = page.getByRole("dialog").first();
  await expect(dialog, `create modal did not open on ${opts.route}`).toBeVisible({ timeout: 8_000 });

  const texts = dialog.locator(
    'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="number"])',
  );
  const tcount = await texts.count();
  for (let i = 0; i < tcount; i++) {
    const el = texts.nth(i);
    if (!(await el.isEditable().catch(() => false))) continue;
    const id = (await el.getAttribute("id").catch(() => "")) ?? "";
    const type = await el.getAttribute("type").catch(() => "");
    await el.fill(fillerFor(id, type, i === 0, opts.token)).catch(() => {});
  }
  const nums = dialog.locator('input[type="number"]');
  for (let i = 0; i < (await nums.count()); i++) await nums.nth(i).fill("1").catch(() => {});

  const selects = dialog.locator("select");
  for (let i = 0; i < (await selects.count()); i++) {
    const oc = await selects.nth(i).locator("option").count().catch(() => 0);
    if (oc > 1) await selects.nth(i).selectOption({ index: oc - 1 }).catch(() => {});
  }
  const tas = dialog.locator("textarea");
  for (let i = 0; i < (await tas.count()); i++) await tas.nth(i).fill("E2E note").catch(() => {});

  await dialog.getByRole("button", { name: opts.submit }).click().catch(() => {});
  await page.waitForTimeout(2000);

  await expect(
    page.getByText(opts.token).first(),
    `created "${opts.token}" not found after submit on ${opts.route} (validation blocked or not listed?)`,
  ).toBeVisible({ timeout: 12_000 });
}
