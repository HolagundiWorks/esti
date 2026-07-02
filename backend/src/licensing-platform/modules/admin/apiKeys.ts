import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../db/client.js";
import { hashApiKey } from "../../lib/apikey.js";
import { newApiKey, newId } from "../../lib/ids.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

export const apiKeysRouter = router({
  /** Never returns the hash or plaintext — only metadata. */
  list: platformAdminProcedure
    .input(z.object({ productId: z.string().optional() }).optional())
    .query(async ({ input }) =>
      db
        .select({
          id: schema.apiKeys.id,
          label: schema.apiKeys.label,
          status: schema.apiKeys.status,
          lastUsedAt: schema.apiKeys.lastUsedAt,
          createdAt: schema.apiKeys.createdAt,
          productId: schema.apiKeys.productId,
          productCode: schema.products.code,
          orgId: schema.apiKeys.orgId,
          orgName: schema.organizations.name,
        })
        .from(schema.apiKeys)
        .innerJoin(schema.products, eq(schema.products.id, schema.apiKeys.productId))
        .leftJoin(schema.organizations, eq(schema.organizations.id, schema.apiKeys.orgId))
        .where(input?.productId ? eq(schema.apiKeys.productId, input.productId) : undefined)
        .orderBy(desc(schema.apiKeys.createdAt)),
    ),

  /**
   * Returns the plaintext key ONCE — only the hash is stored. Pass `orgId` to
   * bind the key to one customer org (recommended for per-install product keys):
   * the identity endpoints then reject any attempt to act for another company.
   */
  generate: platformAdminProcedure
    .input(z.object({ productId: z.string(), label: z.string().min(1), orgId: z.string().nullable().optional() }))
    .mutation(async ({ input }) => {
      const apiKey = newApiKey();
      const id = newId("ak");
      await db.insert(schema.apiKeys).values({
        id,
        productId: input.productId,
        orgId: input.orgId ?? null,
        keyHash: hashApiKey(apiKey),
        label: input.label,
        status: "ACTIVE",
      });
      return { id, apiKey };
    }),

  revoke: platformAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db
        .update(schema.apiKeys)
        .set({ status: "REVOKED" })
        .where(eq(schema.apiKeys.id, input.id));
      return { ok: true };
    }),
});
