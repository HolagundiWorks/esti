import { asc } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

export const productsRouter = router({
  /** Products with their plans nested (read-only; plans come from the seed). */
  list: platformAdminProcedure.query(async () => {
    const prods = await db.select().from(schema.products).orderBy(asc(schema.products.code));
    const plns = await db.select().from(schema.plans);
    return prods.map((p) => ({
      ...p,
      plans: plns.filter((pl) => pl.productId === p.id),
    }));
  }),
});
