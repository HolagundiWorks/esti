import {
  MIGRATION_BUNDLE_VERSION,
  MigrationManifest,
  type MigrationManifest as MigrationManifestT,
  diffManifest,
  migrationBlockers,
} from "@esti/contracts";
import { count, sql } from "drizzle-orm";
import { clients, drawings, firm, invoices, projectOffices, users } from "../../db/schema.js";
import type { DB } from "../../db/index.js";
import { firmPlan } from "../../lib/plan.js";
import { recomputeStorageUsage } from "../../lib/storage.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

/** Applied-migration count — the schema-version handshake. 0 if the table is absent. */
async function schemaHeadOf(db: DB): Promise<number> {
  const rows = (await db.execute(sql`
    select case when to_regclass('drizzle.__drizzle_migrations') is null then 0
                else (select count(*) from drizzle.__drizzle_migrations) end::int as n
  `)) as unknown as [{ n: number }];
  return Number(rows[0]?.n ?? 0);
}

/**
 * The complete bundle table-of-contents: exact row counts for every `esti_*`
 * table, the schema head, and total object-store bytes. Read-only.
 */
async function buildManifest(db: DB): Promise<MigrationManifestT> {
  const plan = await firmPlan(db);
  const [firmRow] = await db.select({ name: firm.companyName }).from(firm).limit(1);
  const schemaHead = await schemaHeadOf(db);

  // Enumerate the firm's domain tables from the catalogue, then count them all in
  // a single UNION ALL. Names come from pg_tables (not user input) and are
  // re-validated against a strict pattern before interpolation.
  const tableRows = (await db.execute(sql`
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'esti_%'
    order by tablename
  `)) as unknown as { tablename: string }[];
  const names = tableRows.map((r) => r.tablename).filter((n) => /^esti_[a-z0-9_]+$/.test(n));

  let tables: { table: string; rows: number }[] = [];
  if (names.length > 0) {
    const union = names.map((n) => `select '${n}' as t, count(*)::int as c from "${n}"`).join(" union all ");
    const counts = (await db.execute(sql.raw(union))) as unknown as { t: string; c: number }[];
    tables = counts.map((r) => ({ table: r.t, rows: Number(r.c) })).sort((a, b) => a.table.localeCompare(b.table));
  }

  const fileBytes = await recomputeStorageUsage();
  return {
    bundleVersion: MIGRATION_BUNDLE_VERSION,
    schemaHead,
    plan,
    firmName: firmRow?.name ?? "Your studio",
    tables,
    fileBytes,
  };
}

/**
 * Local → cloud migration (Phase 2). Because the firm boundary is the database
 * boundary (no `firm_id` on domain tables), the transfer is a whole-instance
 * backup→restore into a fresh cloud tenant, not a bespoke row engine — see
 * docs/esti/LOCAL-TO-CLOUD-MIGRATION.md. These endpoints are the read-only
 * verification wrapper around that ops flow: preflight (can it start?), manifest
 * (exact table-of-contents captured on the source), verify (does the restored
 * target match?). All owner-only; none writes domain data.
 */
export const migrationRouter = router({
  /** Readiness: what would move + whether the move can start. */
  preflight: ownerProcedure.query(async ({ ctx }) => {
    const plan = await firmPlan(ctx.db);
    const [firmRow] = await ctx.db.select({ name: firm.companyName }).from(firm).limit(1);
    const schemaHead = await schemaHeadOf(ctx.db);

    const [u] = await ctx.db.select({ n: count() }).from(users);
    const [p] = await ctx.db.select({ n: count() }).from(projectOffices);
    const [c] = await ctx.db.select({ n: count() }).from(clients);
    const [i] = await ctx.db.select({ n: count() }).from(invoices);
    const [d] = await ctx.db.select({ n: count() }).from(drawings);
    const fileBytes = await recomputeStorageUsage();

    const blockers = migrationBlockers({ plan });
    return {
      bundleVersion: MIGRATION_BUNDLE_VERSION,
      schemaHead,
      plan,
      firmName: firmRow?.name ?? "Your studio",
      counts: {
        users: Number(u?.n ?? 0),
        projects: Number(p?.n ?? 0),
        clients: Number(c?.n ?? 0),
        invoices: Number(i?.n ?? 0),
        drawings: Number(d?.n ?? 0),
      },
      fileBytes,
      ready: blockers.length === 0,
      blockers,
    };
  }),

  /** The complete manifest — captured on the SOURCE before migrating. */
  manifest: ownerProcedure.query(({ ctx }) => buildManifest(ctx.db)),

  /**
   * Run on the TARGET after a restore: compute the target's manifest and diff it
   * against the source manifest. `diff.ok` is the precondition to cut over — it
   * proves no rows were dropped, the target held nothing extra (was empty), the
   * schema matches, and the object-store bytes line up.
   */
  verify: ownerProcedure.input(MigrationManifest).query(async ({ ctx, input }) => {
    const current = await buildManifest(ctx.db);
    return { manifest: current, diff: diffManifest(input, current) };
  }),
});
