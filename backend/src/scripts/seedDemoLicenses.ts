/**
 * Seed demo licences in the Holagundi licensing platform — one STANDARD account
 * (demo.standard1 @aorms.in) with a personal org + ACTIVE licence. Idempotent.
 *
 *   pnpm --filter @esti/backend seed:demo-licenses
 */
import { and, eq, isNull } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db, schema } from "../licensing-platform/db/client.js";
import { newId, newLicenseKey } from "../licensing-platform/lib/ids.js";
import { ensureAormsStandardPlan } from "../licensing-platform/lib/standardPlan.js";
import { upsertAccount } from "../licensing-platform/modules/auth/service.js";

const DEMO_PASSWORD = "demo1234";
const DEMO_EMAIL = "demo.standard1@aorms.in";

async function main() {
  const planId = await ensureAormsStandardPlan();
  const [plan] = await db
    .select({
      productId: schema.plans.productId,
      seats: schema.plans.seats,
      deviceLimit: schema.plans.deviceLimit,
    })
    .from(schema.plans)
    .where(eq(schema.plans.id, planId))
    .limit(1);
  if (!plan) throw new Error("STANDARD plan missing after ensure");

  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);
  const account = await upsertAccount({ email: DEMO_EMAIL, name: "Demo Standard 1" });

  await db
    .update(schema.accounts)
    .set({ passwordHash: demoPasswordHash })
    .where(and(eq(schema.accounts.id, account.id), isNull(schema.accounts.passwordHash)));

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
        name: "Demo Standard workspace",
        slug: "demo-standard-1",
        billingEmail: DEMO_EMAIL,
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
    .where(and(eq(schema.licenses.orgId, org!.id), eq(schema.licenses.productId, plan.productId)))
    .limit(1);
  if (existing) {
    console.log(`✓ demo licence already exists for ${DEMO_EMAIL} → ${existing.key}`);
    console.log(`  sign-in password: ${DEMO_PASSWORD}`);
    return;
  }

  const licId = newId("lic");
  const [lic] = await db
    .insert(schema.licenses)
    .values({
      id: licId,
      orgId: org!.id,
      productId: plan.productId,
      planId,
      key: newLicenseKey(),
      status: "ACTIVE",
      seats: plan.seats,
      deviceLimit: plan.deviceLimit,
      notes: "Demo licence",
    })
    .returning();
  await db.insert(schema.licenseEvents).values({
    id: newId("evt"),
    licenseId: licId,
    type: "CREATE",
    actor: "seed:demo",
    meta: { via: "seed", product: "AORMS", plan: "STANDARD" },
  });
  console.log(`✓ demo licence created: ${DEMO_EMAIL} → STANDARD ${lic!.key}`);
  console.log(`  sign-in password: ${DEMO_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo licence seed failed:", err);
    process.exit(1);
  });
