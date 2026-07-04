import { MIGRATION_BUNDLE_VERSION, type MigrationManifest, migrationBlockers } from "@esti/contracts";
import { count, sql } from "drizzle-orm";
import { clients, drawings, firm, invoices, projectOffices, users } from "../../db/schema.js";
import { firmPlan } from "../../lib/plan.js";
import { recomputeStorageUsage } from "../../lib/storage.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

/**
 * Local → cloud migration (Phase 2). Only the READ-ONLY preflight lives here so
 * far: it reports what a whole-instance transfer would move and whether it can
 * start. The destructive export/import + cutover are gated behind an
 * empty-target check and land with the cloud import endpoint.
 */
export const migrationRouter = router({
  /**
   * Read-only readiness report — row counts, object-store bytes, the source
   * schema head (applied-migration count, for the import handshake), and any
   * blockers. Owner-only; writes no domain data.
   */
  preflight: ownerProcedure.query(async ({ ctx }) => {
    const plan = await firmPlan(ctx.db);
    const [firmRow] = await ctx.db.select({ name: firm.companyName }).from(firm).limit(1);

    // Guard against a missing bookkeeping table (fresh DB) with to_regclass.
    const headRows = (await ctx.db.execute(sql`
      select case when to_regclass('drizzle.__drizzle_migrations') is null then 0
                  else (select count(*) from drizzle.__drizzle_migrations) end::int as n
    `)) as unknown as [{ n: number }];
    const schemaHead = Number(headRows[0]?.n ?? 0);

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

  /**
   * The complete bundle manifest: exact row counts for every `esti_*` table,
   * the schema head, and total object-store bytes. Read-only, owner-only. The
   * export stamps this into the bundle; after restore the cloud recomputes its
   * own and `diffManifest` proves the transfer was faithful.
   */
  manifest: ownerProcedure.query(async ({ ctx }): Promise<MigrationManifest> => {
    const plan = await firmPlan(ctx.db);
    const [firmRow] = await ctx.db.select({ name: firm.companyName }).from(firm).limit(1);

    const headRows = (await ctx.db.execute(sql`
      select case when to_regclass('drizzle.__drizzle_migrations') is null then 0
                  else (select count(*) from drizzle.__drizzle_migrations) end::int as n
    `)) as unknown as [{ n: number }];
    const schemaHead = Number(headRows[0]?.n ?? 0);

    // Enumerate the firm's domain tables from the catalogue, then count them all
    // in a single UNION ALL. Names come from pg_tables (not user input) and are
    // re-validated against a strict pattern before interpolation.
    const tableRows = (await ctx.db.execute(sql`
      select tablename from pg_tables
      where schemaname = 'public' and tablename like 'esti_%'
      order by tablename
    `)) as unknown as { tablename: string }[];
    const names = tableRows
      .map((r) => r.tablename)
      .filter((n) => /^esti_[a-z0-9_]+$/.test(n));

    let tables: { table: string; rows: number }[] = [];
    if (names.length > 0) {
      const union = names
        .map((n) => `select '${n}' as t, count(*)::int as c from "${n}"`)
        .join(" union all ");
      const counts = (await ctx.db.execute(sql.raw(union))) as unknown as { t: string; c: number }[];
      tables = counts
        .map((r) => ({ table: r.t, rows: Number(r.c) }))
        .sort((a, b) => a.table.localeCompare(b.table));
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
  }),
});
