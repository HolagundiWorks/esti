import { TRPCError } from "@trpc/server";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { newId, newLicenseKey } from "../../lib/ids.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

async function writeEvent(
  licenseId: string,
  type: string,
  actor: string,
  meta: Record<string, unknown>,
): Promise<void> {
  await db.insert(schema.licenseEvents).values({ id: newId("evt"), licenseId, type, actor, meta });
}

export const licensesRouter = router({
  list: platformAdminProcedure
    .input(z.object({ orgId: z.string().optional(), productId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const conds: SQL[] = [];
      if (input?.orgId) conds.push(eq(schema.licenses.orgId, input.orgId));
      if (input?.productId) conds.push(eq(schema.licenses.productId, input.productId));
      return db
        .select({
          id: schema.licenses.id,
          key: schema.licenses.key,
          status: schema.licenses.status,
          seats: schema.licenses.seats,
          deviceLimit: schema.licenses.deviceLimit,
          expiresAt: schema.licenses.expiresAt,
          createdAt: schema.licenses.createdAt,
          orgId: schema.licenses.orgId,
          orgName: schema.organizations.name,
          productId: schema.licenses.productId,
          productCode: schema.products.code,
          planId: schema.licenses.planId,
          planCode: schema.plans.code,
        })
        .from(schema.licenses)
        .innerJoin(schema.organizations, eq(schema.organizations.id, schema.licenses.orgId))
        .innerJoin(schema.products, eq(schema.products.id, schema.licenses.productId))
        .innerJoin(schema.plans, eq(schema.plans.id, schema.licenses.planId))
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(schema.licenses.createdAt));
    }),

  create: platformAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        productId: z.string(),
        planId: z.string(),
        seats: z.number().int().nullable().optional(),
        deviceLimit: z.number().int().nullable().optional(),
        meterLimit: z.number().int().nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        status: z.enum(["ACTIVE", "TRIAL"]).default("ACTIVE"),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const id = newId("lic");
      const [created] = await db
        .insert(schema.licenses)
        .values({
          id,
          orgId: input.orgId,
          productId: input.productId,
          planId: input.planId,
          key: newLicenseKey(),
          status: input.status,
          seats: input.seats ?? null,
          deviceLimit: input.deviceLimit ?? null,
          meterLimit: input.meterLimit ?? null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          notes: input.notes ?? null,
        })
        .returning();
      await writeEvent(id, "CREATE", ctx.account.email, { status: input.status });
      return created!;
    }),

  setStatus: platformAdminProcedure
    .input(z.object({ licenseId: z.string(), status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]) }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(schema.licenses)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(schema.licenses.id, input.licenseId));
      const type =
        input.status === "REVOKED" ? "REVOKE" : input.status === "SUSPENDED" ? "SUSPEND" : "REINSTATE";
      await writeEvent(input.licenseId, type, ctx.account.email, {});
      return { ok: true };
    }),

  extend: platformAdminProcedure
    .input(z.object({ licenseId: z.string(), expiresAt: z.string().datetime().nullable() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(schema.licenses)
        .set({ expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, updatedAt: new Date() })
        .where(eq(schema.licenses.id, input.licenseId));
      await writeEvent(input.licenseId, "EXTEND", ctx.account.email, { expiresAt: input.expiresAt });
      return { ok: true };
    }),

  /** A single license with its devices + immutable event log. */
  get: platformAdminProcedure
    .input(z.object({ licenseId: z.string() }))
    .query(async ({ input }) => {
      const [license] = await db
        .select()
        .from(schema.licenses)
        .where(eq(schema.licenses.id, input.licenseId))
        .limit(1);
      if (!license) throw new TRPCError({ code: "NOT_FOUND" });
      const devices = await db
        .select()
        .from(schema.devices)
        .where(eq(schema.devices.licenseId, license.id))
        .orderBy(desc(schema.devices.createdAt));
      const events = await db
        .select()
        .from(schema.licenseEvents)
        .where(eq(schema.licenseEvents.licenseId, license.id))
        .orderBy(desc(schema.licenseEvents.at));
      return { license, devices, events };
    }),

  deactivateDevice: platformAdminProcedure
    .input(z.object({ deviceRowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [dev] = await db
        .select()
        .from(schema.devices)
        .where(eq(schema.devices.id, input.deviceRowId))
        .limit(1);
      if (!dev) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(schema.devices).set({ status: "REVOKED" }).where(eq(schema.devices.id, dev.id));
      await writeEvent(dev.licenseId, "DEACTIVATE_DEVICE", ctx.account.email, { deviceId: dev.deviceId });
      return { ok: true };
    }),
});
