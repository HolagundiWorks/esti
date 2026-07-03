import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { newId, newPublicId } from "../../lib/ids.js";
import { inviteMember, listMembers, setMemberStatus } from "../membership/service.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

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
          publicId: newPublicId("C"),
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
});
