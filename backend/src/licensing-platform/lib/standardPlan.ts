import { and, eq, inArray, ne } from "drizzle-orm";
import { STANDARD_LICENCE_LABEL, STANDARD_PLAN_CODE } from "@esti/contracts";
import { db, schema } from "../db/client.js";
import { newId } from "./ids.js";

const AORMS_PRODUCT = "AORMS";
const LEGACY_PLAN_CODES = ["LITE", "CORE", "ENTERPRISE", "PRO"] as const;

export type StandardPlanRow = {
  productId: string;
  productCode: string;
  planId: string;
  planCode: typeof STANDARD_PLAN_CODE;
  seats: number | null;
  deviceLimit: number | null;
  meterLimit: number | null;
};

/** Ensure the AORMS product + single STANDARD plan exist. Returns the plan id. */
export async function ensureAormsStandardPlan(): Promise<string> {
  let [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.code, AORMS_PRODUCT))
    .limit(1);
  if (!product) {
    const productId = newId("prod");
    await db
      .insert(schema.products)
      .values({ id: productId, code: AORMS_PRODUCT, name: "AORMS", kind: "APP" });
    product = { id: productId };
  }

  const [existing] = await db
    .select({ id: schema.plans.id })
    .from(schema.plans)
    .where(and(eq(schema.plans.productId, product.id), eq(schema.plans.code, STANDARD_PLAN_CODE)))
    .limit(1);
  if (existing) return existing.id;

  const planId = newId("plan");
  await db.insert(schema.plans).values({
    id: planId,
    productId: product.id,
    code: STANDARD_PLAN_CODE,
    name: STANDARD_LICENCE_LABEL,
    seats: null,
    deviceLimit: null,
    meterUnit: "seats",
    featureCodes: [],
  });
  return planId;
}

/**
 * Move every AORMS licence onto the STANDARD plan and drop legacy seat caps.
 * Idempotent — safe on every admin catalogue read.
 */
export async function consolidateToStandardPlan(): Promise<void> {
  const standardPlanId = await ensureAormsStandardPlan();
  const [product] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.code, AORMS_PRODUCT))
    .limit(1);
  if (!product) return;

  const legacyPlans = await db
    .select({ id: schema.plans.id })
    .from(schema.plans)
    .where(
      and(
        eq(schema.plans.productId, product.id),
        inArray(schema.plans.code, [...LEGACY_PLAN_CODES]),
      ),
    );
  const legacyIds = legacyPlans.map((p) => p.id);
  if (!legacyIds.length) return;

  await db
    .update(schema.licenses)
    .set({
      planId: standardPlanId,
      seats: null,
      deviceLimit: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.licenses.productId, product.id),
        inArray(schema.licenses.planId, legacyIds),
        ne(schema.licenses.status, "REVOKED"),
      ),
    );
}

/** Resolve the single AORMS STANDARD plan row (self-healing). */
export async function getAormsStandardPlanRow(): Promise<StandardPlanRow> {
  const planId = await ensureAormsStandardPlan();
  const [row] = await db
    .select({
      productId: schema.products.id,
      productCode: schema.products.code,
      planId: schema.plans.id,
      planCode: schema.plans.code,
      seats: schema.plans.seats,
      deviceLimit: schema.plans.deviceLimit,
      meterLimit: schema.plans.meterLimit,
    })
    .from(schema.plans)
    .innerJoin(schema.products, eq(schema.products.id, schema.plans.productId))
    .where(eq(schema.plans.id, planId))
    .limit(1);
  if (!row) throw new Error("standard_plan_missing");
  return { ...row, planCode: STANDARD_PLAN_CODE };
}
