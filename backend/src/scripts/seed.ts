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
import { ensureBuildingDsrCatalog, ensureAiStudioEnabled } from "./seedBuildingDsr.js";

const email = process.env.SEED_OWNER_EMAIL ?? "owner@hcw.in";
const password = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123";
const fullName = process.env.SEED_OWNER_NAME ?? "HCW Owner";

async function main(): Promise<void> {
  const dsr = await ensureBuildingDsrCatalog(db);
  await ensureAiStudioEnabled(db);
  console.log(`✓ building DSR: ${dsr.itemsTotal} items (${dsr.itemsSeeded} new)`);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    console.log(`✓ owner already present: ${email} (no change)`);
    return;
  }

  await db.insert(users).values({
    email,
    fullName,
    role: "OWNER",
    passwordHash: await hashPassword(password),
  });

  console.log("✓ seeded OWNER account");
  console.log(`    email:    ${email}`);
  console.log(`    password: ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed failed:", err);
    process.exit(1);
  });
