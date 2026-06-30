/**
 * Seed 30 demo licences in the Holagundi licensing platform — 10 each for AORMS
 * Lite / Core / Enterprise. Accounts: demo.lite1@aorms.in … demo.lite10,
 * demo.core1 … demo.core10, demo.enterprise1 … demo.enterprise10. Each gets a
 * personal org + an ACTIVE licence on the matching plan. Idempotent (re-runs skip
 * accounts that already hold an AORMS licence).
 *
 *   pnpm --filter @esti/backend seed:demo-licenses
 *   (or: podman exec esti-backend sh -c "cd /app/esti/backend && pnpm seed:demo-licenses")
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "../licensing-platform/db/client.js";
import { newId, newLicenseKey } from "../licensing-platform/lib/ids.js";
import { upsertAccount } from "../licensing-platform/modules/auth/service.js";

const PRODUCT = { code: "AORMS", name: "AORMS", kind: "APP" };

const PLANS = [
  { code: "LITE", name: "AORMS Lite", seats: 3, deviceLimit: 3, featureCodes: [] as string[] },
  { code: "CORE", name: "AORMS Core", seats: 15, deviceLimit: 15, featureCodes: ["ai", "byos"] },
  {
    code: "ENTERPRISE",
    name: "AORMS Enterprise",
    seats: null as number | null,
    deviceLimit: null as number | null,
    featureCodes: ["ai", "byos", "aiByoApi", "selfHost"],
  },
];

async function ensureProduct(): Promise<string> {
  const [p] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.code, PRODUCT.code))
    .limit(1);
  if (p) return p.id;
  const id = newId("prod");
  await db
    .insert(schema.products)
    .values({ id, code: PRODUCT.code, name: PRODUCT.name, kind: PRODUCT.kind });
  return id;
}

async function ensurePlan(productId: string, def: (typeof PLANS)[number]): Promise<string> {
  const [pl] = await db
    .select()
    .from(schema.plans)
    .where(and(eq(schema.plans.productId, productId), eq(schema.plans.code, def.code)))
    .limit(1);
  if (pl) return pl.id;
  const id = newId("plan");
  await db.insert(schema.plans).values({
    id,
    productId,
    code: def.code,
    name: def.name,
    seats: def.seats,
    deviceLimit: def.deviceLimit,
    meterUnit: "seats",
    featureCodes: def.featureCodes,
  });
  return id;
}

async function main() {
  const productId = await ensureProduct();

  let created = 0;
  let skipped = 0;
  for (const def of PLANS) {
    const tier = def.code.toLowerCase();
    const planId = await ensurePlan(productId, def);

    for (let n = 1; n <= 10; n++) {
      const email = `demo.${tier}${n}@aorms.in`;
      const account = await upsertAccount({ email, name: `Demo ${def.code} ${n}` });

      // Personal org — reuse the one they own, else create it.
      let [org] = await db
        .select()
        .from(schema.organizations)
        .where(eq(schema.organizations.ownerAccountId, account.id))
        .limit(1);
      if (!org) {
        const orgId = newId("org");
        [org] = await db
          .insert(schema.organizations)
          .values({
            id: orgId,
            name: `Demo ${def.code} ${n}`,
            slug: `demo-${tier}-${n}`,
            billingEmail: email,
            ownerAccountId: account.id,
          })
          .returning();
        await db
          .insert(schema.orgMembers)
          .values({ id: newId("mem"), orgId, accountId: account.id, role: "OWNER" })
          .onConflictDoNothing();
      }

      const [existing] = await db
        .select()
        .from(schema.licenses)
        .where(and(eq(schema.licenses.orgId, org!.id), eq(schema.licenses.productId, productId)))
        .limit(1);
      if (existing) {
        skipped++;
        continue;
      }

      const licId = newId("lic");
      const [lic] = await db
        .insert(schema.licenses)
        .values({
          id: licId,
          orgId: org!.id,
          productId,
          planId,
          key: newLicenseKey(),
          status: "ACTIVE",
          seats: def.seats,
          deviceLimit: def.deviceLimit,
          notes: "Demo licence",
        })
        .returning();
      await db.insert(schema.licenseEvents).values({
        id: newId("evt"),
        licenseId: licId,
        type: "CREATE",
        actor: "seed:demo",
        meta: { via: "seed", product: PRODUCT.code, plan: def.code },
      });
      console.log(`  ${email.padEnd(28)} → ${def.code.padEnd(10)} ${lic!.key}`);
      created++;
    }
  }
  console.log(`✓ demo licences: ${created} created, ${skipped} existing (Lite/Core/Enterprise × 10)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo licence seed failed:", err);
    process.exit(1);
  });
