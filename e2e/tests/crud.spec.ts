import { test } from "@playwright/test";
import { createInModule } from "../fixtures/crud.js";

/**
 * "Each item entered" — a real create round-trip per module: open the New-X
 * modal, fill it, submit, and assert the new record (a unique E2E-stamped name)
 * lands in the list. Reuses the saved session (crud project). Created records
 * carry an "E2E …" name + timestamp so they're identifiable in the demo DB.
 */
const STAMP = Date.now();

const MODULES = [
  { name: "client", route: "/clients", open: /new client|add client/i, submit: /^create$/i },
  { name: "lead", route: "/leads", open: /new lead|add lead/i, submit: /capture lead/i },
  { name: "consultant", route: "/consultants", open: /new consultant|add consultant/i, submit: /^create$/i },
  { name: "contractor", route: "/contractors", open: /new contractor|add contractor/i, submit: /^create$/i },
] as const;

for (const m of MODULES) {
  test(`create ${m.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    await createInModule(page, {
      route: m.route,
      open: m.open,
      submit: m.submit,
      token: `E2E ${m.name} ${STAMP}`,
    });
  });
}
