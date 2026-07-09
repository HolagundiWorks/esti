import { and, eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db, schema } from "../licensing-platform/db/client.js";
import { newId } from "../licensing-platform/lib/ids.js";
import { upsertAccount } from "../licensing-platform/modules/auth/service.js";
import { provisionTrial } from "../licensing-platform/modules/onboarding/service.js";
import { DEMO_STUDIO_FIRM } from "../scripts/demoStudioSeed.js";
import { demoPasswordFromEnv } from "./demoSeeds.js";

const DEMO_PRINCIPAL = "principal@demo.aorms.in";
const DEMO_ORG_SLUG = "studio-sharma-demo";

/**
 * Mirror the demo workspace owner onto the licensing platform so the same
 * credentials work at /login, /account, and /company-account.
 */
export async function ensureDemoPlatformAccount(plainPassword?: string): Promise<void> {
  const pwHash = await hashPassword(plainPassword ?? demoPasswordFromEnv());
  const account = await upsertAccount({
    email: DEMO_PRINCIPAL,
    name: "Ar. Vihaan Sharma (Principal)",
  });

  await db
    .update(schema.accounts)
    .set({ passwordHash: pwHash, updatedAt: new Date() })
    .where(eq(schema.accounts.id, account.id));

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
        name: DEMO_STUDIO_FIRM.companyName,
        slug: DEMO_ORG_SLUG,
        loginDomain: "demo.aorms.in",
        billingEmail: DEMO_PRINCIPAL,
        ownerAccountId: account.id,
      })
      .returning();
  } else {
    await db
      .update(schema.organizations)
      .set({
        name: DEMO_STUDIO_FIRM.companyName,
        loginDomain: org.loginDomain ?? "demo.aorms.in",
        updatedAt: new Date(),
      })
      .where(eq(schema.organizations.id, org.id));
  }

  if (!org) {
    throw new Error("Failed to provision demo organization");
  }

  const [member] = await db
    .select()
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, org.id), eq(schema.orgMembers.accountId, account.id)))
    .limit(1);

  if (!member) {
    await db.insert(schema.orgMembers).values({
      id: newId("mem"),
      orgId: org.id,
      accountId: account.id,
      role: "OWNER",
      status: "ACTIVE",
      activatedAt: new Date(),
    });
  } else if (member.status !== "ACTIVE" || member.role !== "OWNER") {
    await db
      .update(schema.orgMembers)
      .set({ role: "OWNER", status: "ACTIVE", activatedAt: new Date() })
      .where(eq(schema.orgMembers.id, member.id));
  }

  await provisionTrial(account);
}
