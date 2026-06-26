/**
 * Build the SPA for the desktop installer.
 *
 * The desktop app is a real, self-hosted firm workspace — NOT the public demo —
 * so it must build with VITE_PUBLIC_SITE=false: the login page shows the manual
 * email/password form + signup, never the public-demo role picker. (Set in a
 * cross-platform way here because the repo has no cross-env.)
 */
import { execSync } from "node:child_process";

process.env.VITE_PUBLIC_SITE = "false";
console.log("• building frontend (VITE_PUBLIC_SITE=false — firm app) …");
execSync("pnpm --filter @esti/frontend build", { stdio: "inherit" });
