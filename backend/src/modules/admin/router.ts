import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "../../auth/session.js";
import { users } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { ownerProcedure, router } from "../../trpc/trpc.js";

// Reference/config tables preserved by a data reset.
const KEEP_TABLES = new Set([
  "esti_firm",
  "esti_orgsettings",
  "esti_user",
  "esti_session",
  "esti_dsr_version",
  "esti_dsr_item",
  "esti_audit",
]);

export const adminRouter = router({
  /**
   * Owner-only: irreversibly wipe ALL operational data (projects, clients,
   * invoices, drawings, HR, etc.), keeping the firm profile, owner login and
   * rate-book reference data. Requires the owner's password.
   */
  purge: ownerProcedure
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.isSystemAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Requires system admin access" });
      }
      const [me] = await ctx.db.select().from(users).where(sql`${users.id} = ${ctx.user.id}`);
      if (!me?.passwordHash || !(await verifyPassword(me.passwordHash, input.password))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect admin password" });
      }

      const tableRows = (await ctx.db.execute(
        sql`select tablename from pg_tables where schemaname = 'public' and (tablename like 'esti_%' or tablename like 'sf_%')`,
      )) as unknown as { tablename: string }[];
      const wipe = tableRows
        .map((r) => r.tablename)
        .filter((t) => !KEEP_TABLES.has(t))
        .map((t) => `"${t}"`);

      if (wipe.length > 0) {
        await ctx.db.execute(sql.raw(`TRUNCATE TABLE ${wipe.join(", ")} RESTART IDENTITY CASCADE`));
      }
      // Drop every non-owner login (portal + staff) and their sessions, but
      // keep the acting owner's session alive.
      await ctx.db.execute(
        sql`delete from esti_session where user_id in (select id from esti_user where role <> 'OWNER')`,
      );
      await ctx.db.execute(sql`delete from esti_user where role <> 'OWNER'`);
      const result = { ok: true, tablesWiped: wipe.length };

      await writeAudit(ctx.db, {
        entity: "admin",
        action: "PURGE_OPERATIONAL_DATA",
        actorId: ctx.user.id,
        after: { tablesWiped: wipe.length },
      });
      return result;
    }),
});
