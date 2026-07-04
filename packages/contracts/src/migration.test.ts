import { describe, expect, it } from "vitest";
import { MIGRATION_BUNDLE_VERSION, MigrationPreflight, migrationBlockers } from "./migration.js";

describe("migrationBlockers", () => {
  it("blocks a Lite install from migrating to the cloud", () => {
    expect(migrationBlockers({ plan: "LITE" })).toEqual([
      "Upgrade to Pro before moving your studio to the cloud.",
    ]);
  });

  it("clears once on Pro", () => {
    expect(migrationBlockers({ plan: "PRO" })).toEqual([]);
  });
});

describe("MigrationPreflight schema", () => {
  it("accepts a well-formed preflight report", () => {
    const ok = MigrationPreflight.safeParse({
      bundleVersion: MIGRATION_BUNDLE_VERSION,
      schemaHead: 151,
      plan: "PRO",
      firmName: "Test Studio",
      counts: { users: 3, projects: 12, clients: 8, invoices: 20, drawings: 40 },
      fileBytes: 1048576,
      ready: true,
      blockers: [],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects negative counts", () => {
    const bad = MigrationPreflight.safeParse({
      bundleVersion: 1,
      schemaHead: 1,
      plan: "PRO",
      firmName: "X",
      counts: { users: -1, projects: 0, clients: 0, invoices: 0, drawings: 0 },
      fileBytes: 0,
      ready: true,
      blockers: [],
    });
    expect(bad.success).toBe(false);
  });
});
