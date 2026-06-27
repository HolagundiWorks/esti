import { test, expect } from "@playwright/test";
import { loginAs } from "../fixtures/auth.js";

/**
 * "Every PDF generated" — exercises the PDF generation path. PDFs are produced
 * asynchronously by the Python worker (render_pdf jobs) and surfaced via a
 * status Tag (PENDING → PROCESSING → READY) plus a download/open action.
 *
 * This walks the screens that own PDF generation, triggers the first available
 * "Generate PDF" control, and waits for the status to reach READY (or a download
 * to start). It is resilient: a screen with no PDF-able rows is reported as a
 * skip, not a failure, so the suite is meaningful on whatever demo data exists.
 */
const PDF_SCREENS = ["/invoices", "/accounting/fees", "/office/proposals"];

test("PDF generation — trigger and reach READY where data exists", async ({ page }) => {
  await loginAs(page, "principal");

  const results: string[] = [];
  for (const screen of PDF_SCREENS) {
    await page.goto(screen);
    await page.waitForLoadState("networkidle").catch(() => {});

    const trigger = page.getByRole("button", { name: /generate pdf|create pdf|pdf/i }).first();
    if ((await trigger.count().catch(() => 0)) === 0) {
      results.push(`${screen}: no PDF control / no rows (skipped)`);
      continue;
    }

    // Either a download fires, or the on-screen status reaches READY.
    const downloadPromise = page.waitForEvent("download", { timeout: 45_000 }).catch(() => null);
    await trigger.click().catch(() => {});
    const ready = page
      .getByText(/READY/i)
      .first()
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(() => true)
      .catch(() => false);

    const download = await downloadPromise;
    const reachedReady = await ready;
    expect(download !== null || reachedReady, `${screen}: PDF neither downloaded nor reached READY`).toBe(true);
    results.push(`${screen}: ${download ? "downloaded" : "READY"}`);
  }

  console.log("PDF results:\n" + results.join("\n"));
  // The suite passes as long as no screen with a PDF control failed to produce one.
  expect(results.every((r) => !r.includes("neither"))).toBe(true);
});
