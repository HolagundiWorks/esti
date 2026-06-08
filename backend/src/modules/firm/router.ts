import { FirmUpdate, PartnerCreate, PartnerUpdate } from "@esti/contracts";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { firm, partners } from "../../db/schema.js";
import { writeAudit } from "../../lib/audit.js";
import { getFirm } from "../../lib/firm.js";
import { presignedGet } from "../../lib/storage.js";
import { ownerProcedure, protectedProcedure, router } from "../../trpc/trpc.js";

const blankToNull = (v: string | undefined) => (v && v.length > 0 ? v : null);

export const firmRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const f = await getFirm(ctx.db);
    const logoUrl = f.logoKey ? await presignedGet(f.logoKey).catch(() => null) : null;
    return { ...f, logoUrl };
  }),

  update: ownerProcedure.input(FirmUpdate).mutation(async ({ ctx, input }) => {
    const current = await getFirm(ctx.db);
    const [row] = await ctx.db
      .update(firm)
      .set({
        companyName: input.companyName,
        firmType: input.firmType,
        gstType: input.gstType,
        gstin: blankToNull(input.gstin),
        tdsApplicableDefault: input.tdsApplicableDefault,
        architectName: blankToNull(input.architectName),
        coaRegNo: blankToNull(input.coaRegNo),
        pan: blankToNull(input.pan),
        email: blankToNull(input.email),
        phone1Type: input.phone1Type ?? null,
        phone1: blankToNull(input.phone1),
        phone2Type: input.phone2Type ?? null,
        phone2: blankToNull(input.phone2),
        addressLine1: blankToNull(input.addressLine1),
        addressLine2: blankToNull(input.addressLine2),
        city: blankToNull(input.city),
        pincode: blankToNull(input.pincode),
        district: blankToNull(input.district),
        state: blankToNull(input.state),
      })
      .where(eq(firm.id, current.id))
      .returning();
    await writeAudit(ctx.db, {
      entity: "firm",
      entityId: current.id,
      action: "UPDATE",
      actorId: ctx.user.id,
      after: { companyName: input.companyName, gstType: input.gstType, firmType: input.firmType },
    });
    return row!;
  }),

  listPartners: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(partners).orderBy(asc(partners.createdAt));
  }),

  addPartner: ownerProcedure.input(PartnerCreate).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(partners)
      .values({
        name: input.name,
        coaRegNo: blankToNull(input.coaRegNo),
        pan: blankToNull(input.pan),
        din: blankToNull(input.din),
        email: blankToNull(input.email),
        phone1Type: input.phone1Type ?? null,
        phone1: blankToNull(input.phone1),
        phone2Type: input.phone2Type ?? null,
        phone2: blankToNull(input.phone2),
        addressLine1: blankToNull(input.addressLine1),
        addressLine2: blankToNull(input.addressLine2),
        city: blankToNull(input.city),
        pincode: blankToNull(input.pincode),
        district: blankToNull(input.district),
        state: blankToNull(input.state),
      })
      .returning();
    return row!;
  }),

  updatePartner: ownerProcedure.input(PartnerUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const [row] = await ctx.db
      .update(partners)
      .set({
        name: rest.name,
        coaRegNo: blankToNull(rest.coaRegNo),
        pan: blankToNull(rest.pan),
        din: blankToNull(rest.din),
        email: blankToNull(rest.email),
        phone1Type: rest.phone1Type ?? null,
        phone1: blankToNull(rest.phone1),
        phone2Type: rest.phone2Type ?? null,
        phone2: blankToNull(rest.phone2),
        addressLine1: blankToNull(rest.addressLine1),
        addressLine2: blankToNull(rest.addressLine2),
        city: blankToNull(rest.city),
        pincode: blankToNull(rest.pincode),
        district: blankToNull(rest.district),
        state: blankToNull(rest.state),
      })
      .where(eq(partners.id, id))
      .returning();
    return row ?? null;
  }),

  removePartner: ownerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(partners).where(eq(partners.id, input.id));
      return { ok: true };
    }),
});
