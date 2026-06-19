/**
 * Repair demo logins on VPS — sync passwords and print status.
 *
 *   pnpm --filter @esti/backend seed:sync-demo
 *   docker compose -f compose.prod.yaml exec backend pnpm --filter @esti/backend seed:sync-demo:prod
 */
import { eq } from "drizzle-orm";
import { verifyPassword } from "../auth/session.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { demoPasswordFromEnv, syncDemoLoginPasswords } from "../lib/demoSeeds.js";
import { ensureDemoSchema } from "./seedBootstrap.js";

const DEMO_EMAILS = [
  "principal@demo.aorms.in",
  "lead@demo.aorms.in",
  "site@demo.aorms.in",
  "junior@demo.aorms.in",
  "intern@demo.aorms.in",
  "client@demo.aorms.in",
  "solo@demo.aorms.in",
] as const;

async function main(): Promise<void> {
  await ensureDemoSchema();
  const password = demoPasswordFromEnv();
  const synced = await syncDemoLoginPasswords(db, password);
  console.log(`✓ synced ${synced} demo login password(s) → ${password}`);

  let missingPrincipal = false;
  for (const email of DEMO_EMAILS) {
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!u) {
      console.log(`  ✗ ${email} — missing (run seed:demo:prod or seed:demo:solo:prod)`);
      if (email === "principal@demo.aorms.in") missingPrincipal = true;
      continue;
    }
    const ok = !!u.passwordHash && (await verifyPassword(u.passwordHash, password));
    if (u.disabled) {
      console.log(`  ✗ ${email} — disabled`);
    } else if (ok) {
      console.log(`  ✓ ${email} — login ok`);
    } else {
      console.log(`  ✗ ${email} — password mismatch`);
    }
  }

  if (missingPrincipal) {
    console.log("");
    console.log("Studio demo not seeded. Run:");
    console.log("  seed:prod && seed:demo:prod");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("demo sync failed:", err);
    process.exit(1);
  });
