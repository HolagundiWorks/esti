import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { newId } from "../../lib/ids.js";
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
      const [created] = await db
        .insert(schema.organizations)
        .values({
          id: newId("org"),
          name: input.name,
          slug,
          billingEmail: input.billingEmail ?? null,
        })
        .returning();
      return created!;
    }),
});
