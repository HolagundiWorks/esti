/**
 * Build the SPA for the desktop installer.
 *
 * The desktop app is a real, self-hosted firm workspace — NOT the public demo —
 * so it must build with VITE_PUBLIC_SITE=false: the login page shows the manual
 * email/password form + signup, never the public-demo role picker. (Set in a
 * cross-platform way here because the repo has no cross-env.)
 */
import { execSync } from "node:child_process";

console.log("• building frontend (VITE_PUBLIC_SITE=false — firm app) …");
// Build the SPA with vite directly — mirrors the prod image build. We deliberately
// skip the `tsc` and blog-prerender steps of the package's `build` script: types are
// checked in CI / the dev container, the blog prerender is irrelevant to the firm
// desktop app, and tsc's exported-declaration-name inference for the tRPC client is
// non-portable across native checkouts (TS2742) — vite/esbuild strips types anyway.
execSync("pnpm --filter @esti/frontend exec vite build", {
  stdio: "inherit",
  env: { ...process.env, VITE_PUBLIC_SITE: "false" },
});
