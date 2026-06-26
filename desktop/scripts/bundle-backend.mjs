/**
 * Assemble the backend sidecar bundle for the Tauri desktop build.
 *
 * Produces `desktop/src-tauri/resources/backend/` containing the built backend
 * (`dist/`), its production `node_modules` (with the @node-rs/argon2 prebuilt
 * native), and the Drizzle migrations — and vendors a Node runtime as the
 * triple-suffixed sidecar binary `desktop/src-tauri/binaries/esti-backend-<triple>`.
 *
 * The Rust shell launches `esti-backend <resources>/backend/dist/index.js`.
 *
 * Prereqs (run by `pnpm desktop:assemble` first): contracts + backend built.
 * Node is vendored from the current `process.execPath` for the host triple; for
 * cross-OS installers, vendor the matching Node per target.
 */
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const backend = join(repo, "backend");
const out = join(repo, "desktop", "src-tauri", "resources", "backend");
const binaries = join(repo, "desktop", "src-tauri", "binaries");

function rustTargetTriple() {
  // e.g. x86_64-pc-windows-msvc — must match the build target.
  const host = execSync("rustc -vV").toString();
  const m = host.match(/host:\s*(\S+)/);
  if (!m) throw new Error("could not determine rust host triple from `rustc -vV`");
  return m[1];
}

function main() {
  if (!existsSync(join(backend, "dist", "index.js"))) {
    throw new Error("backend/dist not found — run `pnpm --filter @esti/backend build` first");
  }

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // 1. Built JS + migrations (runMigrations() resolves drizzle/ relative to dist/db).
  cpSync(join(backend, "dist"), join(out, "dist"), { recursive: true });
  cpSync(join(backend, "drizzle"), join(out, "drizzle"), { recursive: true });

  // 2. Production node_modules (self-contained, includes the argon2 native).
  //    `pnpm deploy` flattens the workspace package into a portable directory.
  console.log("• pnpm deploy --prod (backend) …");
  execSync(`pnpm --filter @esti/backend deploy --prod --legacy "${join(out, "_deploy")}"`, {
    cwd: repo,
    stdio: "inherit",
  });
  cpSync(join(out, "_deploy", "node_modules"), join(out, "node_modules"), { recursive: true });
  rmSync(join(out, "_deploy"), { recursive: true, force: true });

  // 3. Vendor Node as the triple-suffixed sidecar binary.
  mkdirSync(binaries, { recursive: true });
  const triple = rustTargetTriple();
  const ext = process.platform === "win32" ? ".exe" : "";
  const dest = join(binaries, `esti-backend-${triple}${ext}`);
  copyFileSync(process.execPath, dest);
  console.log(`• vendored node → ${dest}`);

  console.log("✓ backend sidecar bundle assembled at desktop/src-tauri/resources/backend");
}

main();
