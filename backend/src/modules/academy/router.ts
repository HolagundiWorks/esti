/**
 * LXOS Academy — SOP-as-theory (docs/holagundi/SOP.md, curriculum in
 * @esti/contracts) + real-usage-as-practical. A module completes once both
 * theoryReadAt and practicalAt are set; on first completion we best-effort
 * push a portable growth event to the licensing platform (I-5 linked users
 * only — silently skipped otherwise, same "unmanaged is safe" posture as the
 * rest of the platform integration).
 */
import {
  ACADEMY_CURRICULUM,
  ACADEMY_PARTS,
  AcademyAttestPractical,
  AcademyMarkTheoryRead,
  type AcademyModuleProgress,
} from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { audit, sopProgress, users } from "../../db/schema.js";
import type { DB } from "../../db/index.js";
import { recordGrowthAtPlatform } from "../../lib/identityDelegate.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

type SopProgressRow = typeof sopProgress.$inferSelect;

/**
 * AUTO detection rules — (entity, action[, after.status]) verified against
 * each module's own `writeAudit()` call this SOP module maps to. Anything not
 * listed here is SELF-attested; do not add an entry without confirming the
 * exact strings in the source router first (a wrong entity/action just means
 * the module silently never auto-completes — worse than leaving it SELF).
 */
const AUTO_SIGNALS: Record<string, { entity: string; action: string; afterStatus?: string }> = {
  "SOP-01": { entity: "lead", action: "CREATE" },
  "SOP-03": { entity: "proposal", action: "STATUS_UPDATE", afterStatus: "CLIENT_SUBMISSION" },
  "SOP-06": { entity: "task", action: "CREATE" },
  "SOP-07": { entity: "drawing", action: "REVIEW_STATUS_UPDATE" },
  "SOP-08": { entity: "decision", action: "CREATE" },
  "SOP-09": { entity: "permit", action: "CREATE" },
  "SOP-10": { entity: "engagement", action: "CREATE" },
  "SOP-12": { entity: "contractor", action: "RATE" },
  "SOP-15": { entity: "invoice", action: "STATUS", afterStatus: "ISSUED" },
  "SOP-19": { entity: "expense", action: "created" },
  "SOP-20": { entity: "purchaseorder", action: "CREATE" },
  "SOP-21": { entity: "leave", action: "STATUS_UPDATE", afterStatus: "APPROVED" },
  "SOP-26": { entity: "lead", action: "CONVERT" },
};

async function detectAuto(db: DB, userId: string, sopCode: string): Promise<Date | null> {
  const rule = AUTO_SIGNALS[sopCode];
  if (!rule) return null;
  const conds = [eq(audit.actorId, userId), eq(audit.entity, rule.entity), eq(audit.action, rule.action)];
  if (rule.afterStatus) {
    conds.push(sql`${audit.after} ->> 'status' = ${rule.afterStatus}`);
  }
  const [row] = await db
    .select({ createdAt: audit.createdAt })
    .from(audit)
    .where(and(...conds))
    .orderBy(desc(audit.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

/**
 * Get or create this user's progress row for a module.
 *
 * Insert-first with onConflictDoNothing rather than select-then-insert: the
 * panel opens 27 of these at once, so two concurrent loads raced the
 * (user_id, sop_code) unique index and one came back a 500.
 */
async function ensureRow(db: DB, userId: string, sopCode: string): Promise<SopProgressRow> {
  const [created] = await db
    .insert(sopProgress)
    .values({ userId, sopCode })
    .onConflictDoNothing({ target: [sopProgress.userId, sopProgress.sopCode] })
    .returning();
  if (created) return created;
  const [existing] = await db
    .select()
    .from(sopProgress)
    .where(and(eq(sopProgress.userId, userId), eq(sopProgress.sopCode, sopCode)));
  return existing!;
}

/** Runs AUTO detection (if not already satisfied) and stamps completion. */
async function evaluateCompletion(db: DB, userId: string, sopCode: string): Promise<SopProgressRow> {
  const row = await ensureRow(db, userId, sopCode);
  let practicalAt = row.practicalAt;
  let practicalSource = row.practicalSource;
  let dirty = false;

  if (AUTO_SIGNALS[sopCode] && !practicalAt) {
    const detected = await detectAuto(db, userId, sopCode);
    if (detected) {
      practicalAt = detected;
      practicalSource = "AUTO";
      dirty = true;
    }
  }

  const newlyComplete = !row.completedAt && !!row.theoryReadAt && !!practicalAt;
  const completedAt = newlyComplete ? new Date() : row.completedAt;
  if (newlyComplete) dirty = true;

  if (!dirty) return row;

  const [updated] = await db
    .update(sopProgress)
    .set({ practicalAt, practicalSource, completedAt, updatedAt: new Date() })
    .where(eq(sopProgress.id, row.id))
    .returning();

  if (newlyComplete) {
    const [u] = await db
      .select({ accountPublicId: users.accountPublicId })
      .from(users)
      .where(eq(users.id, userId));
    if (u?.accountPublicId) {
      void recordGrowthAtPlatform(u.accountPublicId, "lxos.sop_completed", { sopCode });
    }
  }
  return updated!;
}

function toProgress(row: SopProgressRow): AcademyModuleProgress {
  return {
    sopCode: row.sopCode,
    theoryReadAt: row.theoryReadAt?.toISOString() ?? null,
    practicalSource: (row.practicalSource as "AUTO" | "SELF" | null) ?? null,
    practicalAt: row.practicalAt?.toISOString() ?? null,
    practicalNote: row.practicalNote ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export const academyRouter = router({
  curriculum: protectedProcedure.query(() => ({ parts: ACADEMY_PARTS, modules: ACADEMY_CURRICULUM })),

  myProgress: protectedProcedure.query(async ({ ctx }): Promise<AcademyModuleProgress[]> => {
    // Create any missing rows in one statement and read them back in one more,
    // instead of a select-then-insert per module. Rendering the panel used to
    // cost ~60-100 round trips; it is now 2 plus whatever AUTO detection is
    // genuinely outstanding.
    await ctx.db
      .insert(sopProgress)
      .values(ACADEMY_CURRICULUM.map((m) => ({ userId: ctx.user.id, sopCode: m.code })))
      .onConflictDoNothing({ target: [sopProgress.userId, sopProgress.sopCode] });
    const rows = await ctx.db
      .select()
      .from(sopProgress)
      .where(eq(sopProgress.userId, ctx.user.id));
    const byCode = new Map(rows.map((r) => [r.sopCode, r]));

    const out: AcademyModuleProgress[] = [];
    for (const m of ACADEMY_CURRICULUM) {
      const row = byCode.get(m.code);
      // Only modules that could still change need the completion pass: an
      // AUTO module without a practical yet, or one whose theory+practical are
      // both in but which has not been stamped complete.
      const needsWork =
        !row ||
        (AUTO_SIGNALS[m.code] && !row.practicalAt) ||
        (!row.completedAt && !!row.theoryReadAt && !!row.practicalAt);
      out.push(
        needsWork
          ? toProgress(await evaluateCompletion(ctx.db, ctx.user.id, m.code))
          : toProgress(row),
      );
    }
    return out;
  }),

  markTheoryRead: protectedProcedure
    .input(AcademyMarkTheoryRead)
    .mutation(async ({ ctx, input }): Promise<AcademyModuleProgress> => {
      if (!ACADEMY_CURRICULUM.some((m) => m.code === input.sopCode)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown SOP module." });
      }
      const row = await ensureRow(ctx.db, ctx.user.id, input.sopCode);
      if (!row.theoryReadAt) {
        await ctx.db
          .update(sopProgress)
          .set({ theoryReadAt: new Date(), updatedAt: new Date() })
          .where(eq(sopProgress.id, row.id));
      }
      return toProgress(await evaluateCompletion(ctx.db, ctx.user.id, input.sopCode));
    }),

  attestPractical: protectedProcedure
    .input(AcademyAttestPractical)
    .mutation(async ({ ctx, input }): Promise<AcademyModuleProgress> => {
      const mod = ACADEMY_CURRICULUM.find((m) => m.code === input.sopCode);
      if (!mod) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown SOP module." });
      if (mod.signal !== "SELF") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This module's practical is detected automatically from real usage.",
        });
      }
      const row = await ensureRow(ctx.db, ctx.user.id, input.sopCode);
      if (!row.practicalAt) {
        await ctx.db
          .update(sopProgress)
          .set({
            practicalAt: new Date(),
            practicalSource: "SELF",
            practicalNote: input.note ?? null,
            updatedAt: new Date(),
          })
          .where(eq(sopProgress.id, row.id));
      }
      return toProgress(await evaluateCompletion(ctx.db, ctx.user.id, input.sopCode));
    }),
});
