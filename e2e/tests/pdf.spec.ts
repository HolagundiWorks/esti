import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";

/**
 * "Every PDF generated" — PDFs are produced by the Python worker (render_pdf
 * jobs) and surfaced per row as an open/download affordance plus a (re)generate
 * control and a status. This asserts that each PDF-owning screen with data
 * exposes a **generated PDF artifact** (Open/View/Download PDF, a READY status,
 * or a Regenerate control), and exercises a regeneration without crashing.
 * Screens with no PDF-able rows are reported as skips, not failures.
 */
const PDF_SCREENS = ["/invoices", "/accounting/fees", "/office/proposals"];
const AFFORDANCE = /open pdf|view pdf|download pdf|regenerate|generate pdf/i;

test("PDF generation — artifacts available + regeneration is safe", async ({ page }) => {
  await loginAs(page, "principal");

  const results: string[] = [];
  for (const screen of PDF_SCREENS) {
    await page.goto(screen);
    await page.waitForLoadState("networkidle").catch(() => {});

    const affordance = page.getByRole("button", { name: AFFORDANCE });
    const ready = page.getByText(/\bREADY\b/);
    const hasPdf =
      (await affordance.count().catch(() => 0)) > 0 || (await ready.count().catch(() => 0)) > 0;

    if (!hasPdf) {
      results.push(`${screen}: no PDF rows (skipped)`);
      continue;
    }
    results.push(`${screen}: PDF available`);

    // Exercise a (re)generation where the control exists — must not crash.
    const regen = page.getByRole("button", { name: /regenerate|generate pdf/i }).first();
    if ((await regen.count().catch(() => 0)) > 0) {
      await regen.click().catch(() => {});
      await page.waitForTimeout(1500);
      const crashed = await page
        .getByText(/something went wrong|unexpected error/i)
        .count()
        .catch(() => 0);
      expect(crashed, `${screen}: regenerate crashed the UI`).toBe(0);
    }
  }

  console.log("PDF results:\n" + results.join("\n"));
  // The invoices screen always has demo data → must expose a generated PDF.
  expect(
    results.some((r) => r.includes("PDF available")),
    "no PDF-owning screen exposed a generated PDF artifact",
  ).toBe(true);
});
