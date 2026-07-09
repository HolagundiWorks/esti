import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";
import { inviteMember, listMembers, setMemberStatus } from "../membership/service.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";
import { deleteOrganization } from "./deleteOrganization.js";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

export const orgsRouter = router({
  list: platformAdminProcedure.query(async () =>
    db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt)),
  ),

  create: platformAdminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().optional(),
        billingEmail: z.string().email().optional(),
        /** Company login domain for tenant-first Step-1 (e.g. acme.in). */
        loginDomain: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let slug = slugify(input.slug || input.name);
      const [clash] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.slug, slug))
        .limit(1);
      if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const loginDomain = input.loginDomain?.trim().toLowerCase().replace(/^@/, "") || null;
      const [created] = await db
        .insert(schema.organizations)
        .values({
          id: newId("org"),
          name: input.name,
          slug,
          billingEmail: input.billingEmail ?? null,
          loginDomain,
        })
        .returning();
      return created!;
    }),

  /** Members of an org with their activation status (INVITED / ACTIVE / LEFT). */
  members: platformAdminProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => listMembers(input.orgId)),

  /** Invite a person into an org by email (creates a claimable shell account if new). */
  inviteMember: platformAdminProcedure
    .input(z.object({ orgId: z.string(), email: z.string().email(), role: z.string().optional() }))
    .mutation(async ({ input }) => inviteMember(input.orgId, input.email, input.role)),

  /** Set a member's activation status — approve an invite, or remove access. */
  setMemberStatus: platformAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        accountId: z.string(),
        status: z.enum(["INVITED", "ACTIVE", "LEFT"]),
      }),
    )
    .mutation(async ({ input }) => {
      await setMemberStatus(input.orgId, input.accountId, input.status);
      return { ok: true };
    }),

  /** Permanently delete a company/workspace, its licences, members, and keys. */
  remove: platformAdminProcedure
    .input(
      z.object({
        orgId: z.string(),
        confirmSlug: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [org] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.id, input.orgId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });
      if (org.slug !== input.confirmSlug.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Slug confirmation does not match" });
      }
      try {
        await deleteOrganization(input.orgId, ctx.account.email);
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        if (msg === "not_found") throw new TRPCError({ code: "NOT_FOUND" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
