import {
  MIGRATION_BUNDLE_VERSION,
  MigrationBundle,
  MigrationManifest,
  type MigrationManifest as MigrationManifestT,
  diffManifest,
  migrationBlockers,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { count, sql } from "drizzle-orm";
import { clients, drawings, firm, invoices, projectOffices, users } from "../../db/schema.js";
import type { DB } from "../../db/index.js";
import { firmPlan } from "../../lib/plan.js";
import { recomputeStorageUsage } from "../../lib/storage.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

const TABLE_RE = /^esti_[a-z0-9_]+$/;

/** Applied-migration count — the schema-version handshake. 0 if the table is absent. */
async function schemaHeadOf(db: DB): Promise<number> {
  const rows = (await db.execute(sql`
    select case when to_regclass('drizzle.__drizzle_migrations') is null then 0
                else (select count(*) from drizzle.__drizzle_migrations) end::int as n
  `)) as unknown as [{ n: number }];
  return Number(rows[0]?.n ?? 0);
}

/** Every `esti_*` table's exact row count, sorted — one UNION ALL, no dynamic bash. */
async function tableCounts(db: DB): Promise<{ table: string; rows: number }[]> {
  const tableRows = (await db.execute(sql`
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'esti_%'
    order by tablename
  `)) as unknown as { tablename: string }[];
  const names = tableRows.map((r) => r.tablename).filter((n) => TABLE_RE.test(n));
  if (names.length === 0) return [];
  const union = names.map((n) => `select '${n}' as t, count(*)::int as c from "${n}"`).join(" union all ");
  const counts = (await db.execute(sql.raw(union))) as unknown as { t: string; c: number }[];
  return counts.map((r) => ({ table: r.t, rows: Number(r.c) })).sort((a, b) => a.table.localeCompare(b.table));
}

/** The complete manifest — table-of-contents + schema head + object-store bytes. */
async function buildManifest(db: DB): Promise<MigrationManifestT> {
  const plan = await firmPlan(db);
  const [firmRow] = await db.select({ name: firm.companyName }).from(firm).limit(1);
  const [schemaHead, tables, fileBytes] = await Promise.all([
    schemaHeadOf(db),
    tableCounts(db),
    recomputeStorageUsage(),
  ]);
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
 * Local → cloud migration (Phase 2). The firm boundary is the database boundary
 * (no `firm_id` on domain tables), so this is a whole-instance transfer into a
 * fresh EMPTY tenant — no id-remap. Read paths (preflight/manifest/verify) plus
 * the actual move (export/import). The import is the one destructive write and
 * is guarded three ways: schema handshake, empty-target assert, and a
 * diffManifest verify that rolls the whole restore back on any mismatch.
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
   * SOURCE: package the whole instance into a JSON bundle (manifest + every
   * `esti_*` table's rows). Read-only. v1 = DB rows only; object-store bytes
   * move via the ops runbook until file transport lands.
   */
  export: ownerProcedure.query(async ({ ctx }) => {
    const manifest = await buildManifest(ctx.db);
    const tables: Record<string, unknown[]> = {};
    for (const { table } of manifest.tables) {
      const rows = (await ctx.db.execute(
        sql`select coalesce(json_agg(x), '[]'::json) as rows from ${sql.raw(`"${table}"`)} x`,
      )) as unknown as [{ rows: unknown[] }];
      tables[table] = rows[0]?.rows ?? [];
    }
    return { manifest, tables };
  }),

  /**
   * TARGET: restore a bundle into a freshly provisioned, EMPTY tenant, then
   * verify and (on any mismatch) roll the whole thing back. Guards:
   *  1. schema handshake — bundle.schemaHead must equal the target's,
   *  2. empty-target — refuse if any `esti_*` table already has rows,
   *  3. verify — the restored table counts must match the bundle (diffManifest);
   *     the restore runs with FK triggers disabled (session_replication_role),
   *     so insert order is irrelevant on the empty target.
   */
  import: ownerProcedure.input(MigrationBundle).mutation(async ({ ctx, input }) => {
    const targetHead = await schemaHeadOf(ctx.db);
    if (input.manifest.schemaHead !== targetHead) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Schema mismatch: bundle is at ${input.manifest.schemaHead}, target at ${targetHead}. Deploy the same release to both.`,
      });
    }
    const before = await tableCounts(ctx.db);
    if (before.some((t) => t.rows > 0)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Target is not empty — a migration must restore into a freshly provisioned tenant.",
      });
    }

    const diff = await ctx.db.transaction(async (tx) => {
      // Bulk-load with FK checks off for the duration of the transaction. Requires
      // a superuser DB role (true for the default install user).
      await tx.execute(sql`set local session_replication_role = replica`);

      for (const [table, rows] of Object.entries(input.tables)) {
        if (!TABLE_RE.test(table)) continue;
        if (!Array.isArray(rows) || rows.length === 0) continue;
        await tx.execute(
          sql`insert into ${sql.raw(`"${table}"`)}
              select * from json_populate_recordset(null::${sql.raw(`"${table}"`)}, ${JSON.stringify(rows)}::json)`,
        );
      }

      // DB-dimension verify: neutralise fileBytes (files aren't in a v1 bundle).
      const after: MigrationManifestT = {
        bundleVersion: MIGRATION_BUNDLE_VERSION,
        schemaHead: targetHead,
        plan: input.manifest.plan,
        firmName: input.manifest.firmName,
        tables: await tableCounts(tx),
        fileBytes: input.manifest.fileBytes,
      };
      const d = diffManifest(input.manifest, after);
      if (!d.ok) {
        // Rolls back the whole restore — the target stays empty.
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Restore verification failed; rolled back. Mismatches: ${JSON.stringify(d.tableMismatches)}`,
        });
      }
      return d;
    });

    return { imported: true, diff };
  }),

  /**
   * Run on the TARGET after a restore: recompute its manifest and diff it against
   * the source manifest. `diff.ok` is the cutover gate.
   */
  verify: ownerProcedure.input(MigrationManifest).query(async ({ ctx, input }) => {
    const current = await buildManifest(ctx.db);
    return { manifest: current, diff: diffManifest(input, current) };
  }),
});
