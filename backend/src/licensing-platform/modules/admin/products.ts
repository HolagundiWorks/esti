import { asc } from "drizzle-orm";
import { STANDARD_PLAN_CODE } from "@esti/contracts";
import { db, schema } from "../../db/client.js";
import { consolidateToStandardPlan } from "../../lib/standardPlan.js";
import { platformAdminProcedure, router } from "../../trpc/trpc.js";

export const productsRouter = router({
  /** Products with their plans nested. AORMS exposes only the single STANDARD plan. */
  list: platformAdminProcedure.query(async () => {
    await consolidateToStandardPlan();
    const prods = await db.select().from(schema.products).orderBy(asc(schema.products.code));
    const plns = await db.select().from(schema.plans);
    return prods.map((p) => ({
      ...p,
      plans: plns.filter(
        (pl) =>
          pl.productId === p.id &&
          (p.code !== "AORMS" || pl.code === STANDARD_PLAN_CODE),
      ),
    }));
  }),
});
