import { type Page, expect } from "@playwright/test";

const FIRST_DATE = "2026-06-28";
const LATER_DATE = "2027-06-28"; // for an "end date" that must be after a start date

/** Filler for a non-name field, chosen from its id/type so India-validated
 *  fields (GSTIN/PAN/phone) and emails don't block submit. */
function fillerFor(id: string, type: string): string {
  const k = (id || "").toLowerCase();
  if (type === "email" || k.includes("email")) return "e2e@test.aorms.in";
  if (type === "tel" || k.includes("phone") || k.includes("mobile") || k.includes("contact"))
    return "9999999999";
  if (k.includes("gstin")) return "29ABCDE1234F1Z5";
  if (k.includes("pan")) return "ABCDE1234F";
  return "E2E";
}

/**
 * Open a module's create modal, fill every field by type (first *text* field →
 * the unique token; numbers → 100; dates → valid increasing dates; native
 * selects → an option; textareas → token-or-note; checkboxes left as-is),
 * submit, and verify the create:
 *   - "token"  → the unique name lands in the list (modules with a text name).
 *   - "closed" → the modal closes with no error (auto-numbered / project-scoped
 *     modules like invoices/fees/proposals where there is no listable token).
 * This is the "each item entered" coverage — a real create round-trip per module.
 */
export async function createInModule(
  page: Page,
  opts: { route: string; open: RegExp; submit: RegExp; token: string; verify?: "token" | "closed" },
): Promise<void> {
  const verify = opts.verify ?? "token";

  await page.goto(opts.route);
  await page.waitForLoadState("networkidle").catch(() => {});

  const newBtn = page.getByRole("button", { name: opts.open }).first();
  await expect(newBtn, `no "${opts.open}" button on ${opts.route}`).toBeVisible({ timeout: 10_000 });
  await newBtn.click();

  const dialog = page.getByRole("dialog").first();
  await expect(dialog, `create modal did not open on ${opts.route}`).toBeVisible({ timeout: 8_000 });

  // Fill empty inputs by type. The first text field gets the unique token.
  const state = { tokenPlaced: false, dateSeen: 0 };
  const fillInputs = async () => {
    const inputs = dialog.locator("input");
    for (let i = 0; i < (await inputs.count()); i++) {
      const el = inputs.nth(i);
      if (!(await el.isEditable().catch(() => false))) continue;
      const type = ((await el.getAttribute("type").catch(() => "")) ?? "").toLowerCase();
      if (type === "checkbox" || type === "radio" || type === "file") continue;
      if ((await el.inputValue().catch(() => "")) !== "") continue; // keep token/dates
      const id = (await el.getAttribute("id").catch(() => "")) ?? "";

      if (type === "number") {
        await el.fill("100").catch(() => {});
      } else if (type === "date") {
        await el.fill(state.dateSeen === 0 ? FIRST_DATE : LATER_DATE).catch(() => {});
        state.dateSeen += 1;
      } else if (!state.tokenPlaced && (type === "" || type === "text" || type === "search")) {
        await el.fill(opts.token).catch(() => {});
        state.tokenPlaced = true;
      } else {
        await el.fill(fillerFor(id, type)).catch(() => {});
      }
    }
  };

  await fillInputs();

  const selects = dialog.locator("select");
  for (let i = 0; i < (await selects.count()); i++) {
    const oc = await selects.nth(i).locator("option").count().catch(() => 0);
    if (oc > 1) await selects.nth(i).selectOption({ index: oc - 1 }).catch(() => {});
  }

  // A select may have revealed a conditional required field (e.g. a cash voucher
  // number when Payment method = Cash) — fill any newly-shown inputs.
  await fillInputs();

  const tas = dialog.locator("textarea");
  for (let i = 0; i < (await tas.count()); i++) {
    if (!state.tokenPlaced) {
      await tas.nth(i).fill(opts.token).catch(() => {});
      state.tokenPlaced = true;
    } else {
      await tas.nth(i).fill("E2E note").catch(() => {});
    }
  }

  await dialog.getByRole("button", { name: opts.submit }).click().catch(() => {});

  if (verify === "closed") {
    await expect(
      dialog,
      `create modal did not close on ${opts.route} (validation blocked submit?)`,
    ).toBeHidden({ timeout: 12_000 });
  } else {
    await page.waitForTimeout(1500);
    await expect(
      page.getByText(opts.token).first(),
      `created "${opts.token}" not found after submit on ${opts.route} (validation blocked or not listed?)`,
    ).toBeVisible({ timeout: 12_000 });
  }
}
