/**
 * Dev-seed: ensure a known OWNER login exists on a fresh pod.
 *
 *   pnpm --filter @esti/backend seed
 *   (or: podman exec esti-backend sh -c "cd /app/backend && pnpm seed")
 *
 * Idempotent — if the owner email already exists it does nothing. Credentials
 * come from env (SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD / SEED_OWNER_NAME) and
 * fall back to the documented dev defaults. NOT for production use.
 */
import { eq } from "drizzle-orm";
import { hashPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import {
  demoPasswordFromEnv,
  isDemoAormsEmail,
  syncDemoOwnerPassword,
} from "../lib/demoSeeds.js";
import { ensureBuildingDsrCatalog, ensureAiStudioEnabled } from "./seedBuildingDsr.js";

const email = process.env.SEED_OWNER_EMAIL ?? "owner@hcw.in";
const password = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123";
const fullName = process.env.SEED_OWNER_NAME ?? "HCW Owner";

async function main(): Promise<void> {
  const dsr = await ensureBuildingDsrCatalog(db);
  await ensureAiStudioEnabled(db);
  console.log(`✓ building DSR: ${dsr.itemsTotal} items (${dsr.itemsSeeded} new)`);

  const loginPassword = isDemoAormsEmail(email) ? demoPasswordFromEnv() : password;

  // The real firm owner is the full administrator of their own instance (system admin).
  // The public demo principal is not — it relies on isDemo for the demo-reset path.
  const fullAdmin = !isDemoAormsEmail(email);

  const [existing] = await db
    .select({ id: users.id, isSystemAdmin: users.isSystemAdmin })
    .from(users)
    .where(eq(users.email, email));
  if (existing) {
    if (isDemoAormsEmail(email)) {
      await syncDemoOwnerPassword(db, email, loginPassword);
      console.log(`✓ demo owner password synced: ${email} / ${loginPassword}`);
    } else if (!existing.isSystemAdmin) {
      await db.update(users).set({ isSystemAdmin: true }).where(eq(users.id, existing.id));
      console.log(`✓ owner promoted to full system admin: ${email}`);
    } else {
      console.log(`✓ owner already present with full access: ${email} (no change)`);
    }
    return;
  }

  await db.insert(users).values({
    email,
    fullName,
    role: "OWNER",
    passwordHash: await hashPassword(loginPassword),
    isDemo: isDemoAormsEmail(email),
    isSystemAdmin: fullAdmin,
    designation: "Principal Architect",
  });

  console.log(`✓ seeded OWNER account${fullAdmin ? " (full system admin)" : ""}`);
  console.log(`    email:    ${email}`);
  console.log(`    password: ${loginPassword}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
