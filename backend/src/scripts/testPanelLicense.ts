import { panelDerived, verifyPanelToken } from "../lib/panelLicense.js";
import { activateViaPanel } from "../modules/license/consumer.js";

/**
 * Manual end-to-end check of the in-tree HCW License Manager integration.
 * Requires a running manager (`/platform`) and these env vars:
 *   ESTI_LICENSE_API_URL  e.g. http://127.0.0.1:4000/platform
 *   ESTI_PRODUCT_API_KEY  an AORMS product API key (console → API keys)
 *   TEST_LICENSE_KEY      an AORMS license key (console → Licenses)
 *
 * Run:  pnpm tsx src/scripts/testPanelLicense.ts
 */
async function main(): Promise<void> {
  const key = process.env.TEST_LICENSE_KEY;
  if (!key) throw new Error("set TEST_LICENSE_KEY to an AORMS license key from the licensing console");

  const token = await activateViaPanel(key, "test-install-001");
  const v = verifyPanelToken(token);
  if (!v.ok) throw new Error(`panel token verify failed: ${v.reason}`);
  const derived = panelDerived(v.payload);

  console.log(
    JSON.stringify(
      {
        productCode: v.payload.productCode,
        planCode: v.payload.planCode,
        derivedPlan: derived?.plan,
        staffSeats: derived?.seats.staff,
        firmId: derived?.firmId,
        verified: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
