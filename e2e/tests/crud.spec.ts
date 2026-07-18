import { test } from "@playwright/test";
import { createInModule } from "../fixtures/crud.js";

/**
 * "Each item entered" — a real create round-trip per module: open the New-X
 * modal, fill it, submit, and verify the create (token lands in the list, or for
 * auto-numbered/project-scoped docs the modal closes cleanly). Reuses the saved
 * session (crud project). Created records carry an "E2E …" name + timestamp so
 * they're identifiable in the demo DB.
 */
const STAMP = Date.now();

type Verify = "token" | "closed";
const MODULES: {
  name: string;
  route: string;
  open: RegExp;
  submit: RegExp;
  verify?: Verify;
}[] = [
  // CRM — first field is a text name → assert it lands in the list.
  { name: "client", route: "/clients", open: /new client|add client/i, submit: /^create$/i },
  { name: "lead", route: "/leads", open: /new lead|add lead/i, submit: /capture lead/i },
  { name: "consultant", route: "/consultants", open: /new consultant|add consultant/i, submit: /^create$/i },
  { name: "contractor", route: "/contractors", open: /new contractor|add contractor/i, submit: /^create$/i },
  // Office documents with a text title → assert the title lands in the list.
  { name: "contract", route: "/office/contracts", open: /new contract/i, submit: /^create$/i },
  // Auto-numbered / project-scoped docs (no listable token) → modal closes cleanly.
  { name: "invoice", route: "/invoices", open: /new invoice/i, submit: /^create$/i, verify: "closed" },
  { name: "proposal", route: "/office/proposals", open: /new proposal/i, submit: /^create$/i, verify: "closed" },
  { name: "letter", route: "/office/letters", open: /new letter/i, submit: /^create$/i, verify: "closed" },
  { name: "expense", route: "/accounting/office-expenses", open: /new expense/i, submit: /save draft/i, verify: "closed" },
];

for (const m of MODULES) {
  test(`create ${m.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    await createInModule(page, {
      route: m.route,
      open: m.open,
      submit: m.submit,
      verify: m.verify,
      token: `E2E ${m.name} ${STAMP}`,
    });
  });
}
