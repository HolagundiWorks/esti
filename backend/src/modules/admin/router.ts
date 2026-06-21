import { DEFAULT_PHASE_PLAN, GstSystem, computeGst } from "@esti/contracts";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "../../auth/session.js";
import {
  clients,
  feeProposals,
  invoices,
  phases,
  projectOffices,
  users,
} from "../../db/schema.js";
import { getFirm } from "../../lib/firm.js";
import { writeAudit } from "../../lib/audit.js";
import { nextRef } from "../../lib/numbering.js";
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

const DEMO_CLIENTS = [
  { name: "Sharma Residences LLP", kind: "COMPANY", city: "Bengaluru", state: "Karnataka" },
  { name: "Anita Rao", kind: "INDIVIDUAL", city: "Mysuru", state: "Karnataka" },
  { name: "Verde Developers Pvt Ltd", kind: "COMPANY", city: "Bengaluru", state: "Karnataka" },
] as const;

const DEMO_PROJECTS = [
  { title: "Sharma Villa — Whitefield", projectType: "Residential Architecture", contractValuePaise: 45_00_00_000 },
  { title: "Rao House — Mysuru", projectType: "Residential Architecture", contractValuePaise: 1_20_00_000 },
  { title: "Verde Commercial Block", projectType: "Commercial Architecture", contractValuePaise: 8_50_00_000 },
] as const;

export const adminRouter = router({
  /** System-admin only: seed a small set of demo records for evaluation/training. */
  importDemo: ownerProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.isSystemAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Requires system admin access" });
    }
    const firm = await getFirm(ctx.db);
    const system = firm.gstType as GstSystem;
    let projectsCreated = 0;
    let invoicesCreated = 0;

    for (let i = 0; i < DEMO_PROJECTS.length; i++) {
      const dc = DEMO_CLIENTS[i]!;
      const [client] = await ctx.db
        .insert(clients)
        .values({ name: dc.name, kind: dc.kind, city: dc.city, state: dc.state })
        .returning();

      const dp = DEMO_PROJECTS[i]!;
      const { ref } = await nextRef(ctx.db, "projectoffice", "PRJ");
      const [project] = await ctx.db
        .insert(projectOffices)
        .values({
          ref,
          title: dp.title,
          projectType: dp.projectType,
          jurisdiction: "BBMP",
          status: "ACTIVE",
          clientId: client!.id,
          state: "Karnataka",
          contractValuePaise: dp.contractValuePaise,
          createdById: ctx.user.id,
        })
        .returning();
      projectsCreated++;

      // General project delivery stages.
      await ctx.db.insert(phases).values(
        DEFAULT_PHASE_PLAN.map((st, idx) => ({
          projectId: project!.id,
          code: st.code,
          label: st.label,
          billingPct: st.billingPct,
          sortOrder: idx,
          status: idx === 0 ? "COMPLETE" : idx === 1 ? "IN_PROGRESS" : "NOT_STARTED",
        })),
      );

      // One issued invoice on the first project's first phase.
      if (i === 0) {
        const taxablePaise = 5_00_000;
        const g = computeGst(system, taxablePaise, false);
        const { ref: invRef } = await nextRef(ctx.db, "invoice", "INV");
        await ctx.db.insert(invoices).values({
          ref: invRef,
          projectId: project!.id,
          clientId: client!.id,
          status: "ISSUED",
          gstSystem: system,
          documentKind: g.documentKind,
          sac: system === GstSystem.REGULAR ? "998322" : null,
          interState: false,
          tdsApplicable: firm.tdsApplicableDefault,
          taxablePaise: g.taxable,
          cgstPaise: g.cgst,
          sgstPaise: g.sgst,
          igstPaise: g.igst,
          gstTotalPaise: g.gstTotal,
          compositionLevyPaise: g.compositionLevy,
          tdsPaise: 0,
          grandTotalPaise: g.grandTotal,
          netReceivablePaise: g.grandTotal,
          dateInvoice: new Date().toISOString().slice(0, 10),
        });
        invoicesCreated++;
      }

      // A fee proposal on each project.
      const { ref: feeRef } = await nextRef(ctx.db, "feeproposal", "FEE");
      await ctx.db.insert(feeProposals).values({
        ref: feeRef,
        projectId: project!.id,
        workCategory: "ARCHITECTURE",
        costOfWorksPaise: dp.contractValuePaise,
        feePaise: Math.round(dp.contractValuePaise * 0.08),
        docCommPct: 10,
        coaMinimumPaise: 0,
        belowMinimum: false,
      });
    }

    const result = { ok: true, projectsCreated, invoicesCreated, clientsCreated: DEMO_PROJECTS.length };
    await writeAudit(ctx.db, {
      entity: "admin",
      action: "IMPORT_DEMO",
      actorId: ctx.user.id,
      after: result,
    });
    return result;
  }),

  /**
   * Owner-only: irreversibly wipe ALL operational data (projects, clients,
   * invoices, drawings, HR, etc.), keeping the firm profile, owner login and
   * DSR reference data. Requires the owner's password.
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
        sql`select tablename from pg_tables where schemaname = 'public' and tablename like 'esti_%'`,
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
