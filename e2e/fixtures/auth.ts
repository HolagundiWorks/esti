import { type Page, expect } from "@playwright/test";

/**
 * The five demo personas exposed by the public/demo build's persona picker
 * (frontend/src/routes/Login.tsx). Each `match` is a unique substring of the
 * persona button label "<label> - <role>".
 */
export const PERSONAS = {
  principal: { email: "principal@demo.aorms.in", match: /Principal/i, portal: false },
  lead: { email: "lead@demo.aorms.in", match: /Project Lead/i, portal: false },
  site: { email: "site@demo.aorms.in", match: /Site Supervisor/i, portal: false },
  junior: { email: "junior@demo.aorms.in", match: /Jr Architect/i, portal: false },
  client: { email: "client@demo.aorms.in", match: /Client/i, portal: true },
} as const;
export type PersonaKey = keyof typeof PERSONAS;

/** Sign in via the demo persona picker; resolves once the picker is gone (the
 *  SPA has navigated into the authenticated shell). */
export async function loginAs(page: Page, persona: PersonaKey): Promise<void> {
  const p = PERSONAS[persona];
  // The persona picker is the /login route (the demo build's "/" is the public
  // landing page with differently-labelled marketing cards).
  await page.goto("/login");
  const button = page.getByRole("button", { name: p.match });
  await expect(button.first()).toBeVisible({ timeout: 15_000 });
  await button.first().click();
  await expect(page.getByText("Choose a demo role")).toHaveCount(0, { timeout: 20_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** True when the page shows the app's crash fallback (ErrorBoundary) or is blank. */
export async function isCrashed(page: Page): Promise<boolean> {
  const crash = await page
    .getByText(/something went wrong|unexpected error|application error/i)
    .count()
    .catch(() => 0);
  if (crash > 0) return true;
  const text = (await page.locator("body").innerText().catch(() => "")) ?? "";
  return text.trim().length === 0;
}
