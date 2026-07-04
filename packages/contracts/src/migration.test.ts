import { describe, expect, it } from "vitest";
import {
  MIGRATION_BUNDLE_VERSION,
  type MigrationManifest,
  MigrationPreflight,
  diffManifest,
  migrationBlockers,
} from "./migration.js";

const manifest = (over: Partial<MigrationManifest> = {}): MigrationManifest => ({
  bundleVersion: MIGRATION_BUNDLE_VERSION,
  schemaHead: 151,
  plan: "PRO",
  firmName: "Studio",
  tables: [
    { table: "esti_projectoffice", rows: 12 },
    { table: "esti_client", rows: 8 },
  ],
  fileBytes: 1024,
  ...over,
});

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

describe("diffManifest (import verification gate)", () => {
  it("is ok for an identical restore", () => {
    expect(diffManifest(manifest(), manifest()).ok).toBe(true);
  });

  it("flags a dropped row (table count short in the target)", () => {
    const actual = manifest({ tables: [{ table: "esti_projectoffice", rows: 11 }, { table: "esti_client", rows: 8 }] });
    const d = diffManifest(manifest(), actual);
    expect(d.ok).toBe(false);
    expect(d.tableMismatches).toContainEqual({ table: "esti_projectoffice", expected: 12, actual: 11 });
  });

  it("flags a non-empty target (extra rows the bundle didn't carry)", () => {
    const actual = manifest({ tables: [...manifest().tables, { table: "esti_invoice", rows: 3 }] });
    const d = diffManifest(manifest(), actual);
    expect(d.ok).toBe(false);
    expect(d.tableMismatches).toContainEqual({ table: "esti_invoice", expected: 0, actual: 3 });
  });

  it("flags schema skew and file-byte drift", () => {
    expect(diffManifest(manifest(), manifest({ schemaHead: 150 })).schemaHeadMismatch).toBe(true);
    expect(diffManifest(manifest(), manifest({ fileBytes: 999 })).fileBytesMismatch).toBe(true);
  });
});
