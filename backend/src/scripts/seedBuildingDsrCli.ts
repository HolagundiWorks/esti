/**
 * Seed standard building DSR (Schedule of Rates) for takeoff-linked estimation.
 *
 *   pnpm --filter @esti/backend seed:dsr
 *   (or: podman exec esti-backend sh -c "cd /app/backend && pnpm seed:dsr")
 */
import { db } from "../db/index.js";
import { ensureBuildingDsrCatalog } from "./seedBuildingDsr.js";

async function main(): Promise<void> {
  const result = await ensureBuildingDsrCatalog(db);
  console.log("✓ building DSR catalog ready");
  console.log(`    version id:  ${result.versionId}`);
  console.log(`    items:       ${result.itemsTotal} (${result.itemsSeeded} newly inserted)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("building DSR seed failed:", err);
    process.exit(1);
  });
