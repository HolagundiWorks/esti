import { toWebcalUrl, type WorkloadCalendarScope } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { tasks, teamMembers } from "../../db/schema.js";
import {
  calendarFeedPath,
  ensureCalendarFeedToken,
  rotateCalendarFeedToken,
} from "../../lib/workloadCalendar.js";
import { requireHrEnabled } from "../../lib/settings.js";
import { protectedProcedure, router } from "../../trpc/trpc.js";

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Staff workload: per-person task load for a day + a month calendar of totals. */
export const workloadRouter = router({
  /** Per-person open-task counts due on a given day, plus the office cumulative. */
  day: protectedProcedure.input(z.object({ date: DateStr })).query(async ({ ctx, input }) => {
    await requireHrEnabled(ctx.db);
    const rows = await ctx.db
      .select({ assignee: tasks.assignee, n: count() })
      .from(tasks)
      .where(
        and(
          sql`${tasks.status} <> 'DONE'`,
          eq(tasks.dueDate, input.date),
          sql`${tasks.assignee} is not null and ${tasks.assignee} <> ''`,
        ),
      )
      .groupBy(tasks.assignee);

    const counts = new Map<string, number>();
    for (const r of rows) if (r.assignee) counts.set(r.assignee, Number(r.n));

    // Union with active team members so zero-load staff still surface (light band).
    const members = await ctx.db
      .select({ name: teamMembers.name })
      .from(teamMembers)
      .where(eq(teamMembers.active, true));
    for (const m of members) if (!counts.has(m.name)) counts.set(m.name, 0);

    const people = [...counts.entries()]
      .map(([name, c]) => ({ name, count: c }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const total = people.reduce((sum, p) => sum + p.count, 0);
    const headcount = members.length > 0 ? members.length : people.length;
    return { date: input.date, total, headcount, people };
  }),

  /** Daily totals of open tasks due across a month, for the calendar markings. */
  month: protectedProcedure
    .input(z.object({ year: z.number().int().min(1970).max(9999), month: z.number().int().min(0).max(11) }))
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      const pad = (n: number) => String(n).padStart(2, "0");
      const start = `${input.year}-${pad(input.month + 1)}-01`;
      const ny = input.month === 11 ? input.year + 1 : input.year;
      const nm = input.month === 11 ? 0 : input.month + 1;
      const end = `${ny}-${pad(nm + 1)}-01`;

      const rows = await ctx.db
        .select({ d: tasks.dueDate, n: count() })
        .from(tasks)
        .where(
          and(
            sql`${tasks.status} <> 'DONE'`,
            sql`${tasks.dueDate} >= ${start} and ${tasks.dueDate} < ${end}`,
          ),
        )
        .groupBy(tasks.dueDate);

      const [hc] = await ctx.db
        .select({ n: count() })
        .from(teamMembers)
        .where(eq(teamMembers.active, true));

      return {
        headcount: Number(hc?.n ?? 0),
        days: rows
          .filter((r) => r.d)
          .map((r) => ({ date: String(r.d), total: Number(r.n) })),
      };
    }),

  /**
   * Subscription URL for Google Calendar / Apple Calendar (iCal over HTTPS).
   * Google: Other calendars → Add by URL → paste the https link.
   */
  calendarSubscription: protectedProcedure
    .input(
      z
        .object({
          scope: z.enum(["mine", "office"]).default("mine"),
          origin: z.string().url().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      await requireHrEnabled(ctx.db);
      if (ctx.user.role === "CLIENT" || ctx.user.role === "CONSULTANT") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Staff account required." });
      }

      const scope: WorkloadCalendarScope = input?.scope ?? "mine";
      if (scope === "office" && !["OWNER", "PARTNER", "SENIOR"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Office workload feed requires Partner or above.",
        });
      }

      const token = await ensureCalendarFeedToken(ctx.db, ctx.user.id);
      const path = calendarFeedPath(token, scope);
      const origin = input?.origin?.replace(/\/$/, "") ?? "";
      const httpsUrl = origin ? `${origin}${path}` : path;
      const webcalUrl = origin ? toWebcalUrl(httpsUrl) : toWebcalUrl(`https://example.com${path}`);

      return {
        scope,
        path,
        httpsUrl,
        webcalUrl,
        canOfficeScope: ["OWNER", "PARTNER", "SENIOR"].includes(ctx.user.role),
      };
    }),

  /** Invalidate the old subscription link and issue a new secret token. */
  regenerateCalendarToken: protectedProcedure.mutation(async ({ ctx }) => {
    await requireHrEnabled(ctx.db);
    if (ctx.user.role === "CLIENT" || ctx.user.role === "CONSULTANT") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Staff account required." });
    }
    await rotateCalendarFeedToken(ctx.db, ctx.user.id);
    return { ok: true as const };
  }),
});
