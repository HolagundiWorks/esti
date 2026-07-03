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
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

  // 2. Production node_modules — FLAT + portable. pnpm 9's `deploy` emits absolute
  //    symlinks into a `.pnpm` store, which break once this tree is copied into the
  //    installer and unpacked on another machine. Instead, pack the two workspace
  //    deps (@esti/contracts, @hcw/aorms-ai-kit — both zod-only) as tarballs and let
  //    `npm install --omit=dev` resolve a flat tree (incl. the @node-rs/argon2 win32
  //    prebuilt) — no symlinks, fully relocatable.
  console.log("• staging production node_modules (npm, flat) …");
  const stage = join(out, "_stage");
  const tgzDir = join(stage, "_tgz");
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(tgzDir, { recursive: true });

  function packWorkspace(pkgDir) {
    const before = new Set(readdirSync(tgzDir));
    // npm pack in the package dir (dist is already built by assemble; --ignore-scripts
    // skips any prepack). `pnpm --filter <pkg> pack` is rejected as a recursive op.
    execSync(`npm pack --pack-destination "${tgzDir}" --ignore-scripts`, {
      cwd: join(repo, pkgDir),
      stdio: "inherit",
    });
    const added = readdirSync(tgzDir).filter((f) => f.endsWith(".tgz") && !before.has(f));
    if (added.length !== 1) throw new Error(`pack ${pkgDir} produced ${added.length} tarball(s)`);
    return join(tgzDir, added[0]).replace(/\\/g, "/");
  }
  const contractsTgz = packWorkspace("packages/contracts");
  const aiKitTgz = packWorkspace("vendor/hcw-aorms-ai-kit");

  const pkg = JSON.parse(readFileSync(join(backend, "package.json"), "utf8"));
  delete pkg.devDependencies;
  delete pkg.scripts;
  // Always stage the backend WITHOUT the heavy AI kit by default so the installer
  // stays light. We still create an _ai_node_modules.tgz artifact that the
  // Core/Enterprise installers can include and unpack at install-time.
  pkg.dependencies["@esti/contracts"] = `file:${contractsTgz}`;
  // Remove workspace-only AI kit reference so `npm install` in the stage
  // doesn't fail due to unsupported "workspace:*" protocol.
  if (pkg.dependencies && pkg.dependencies["@hcw/aorms-ai-kit"]) {
    delete pkg.dependencies["@hcw/aorms-ai-kit"];
  }
  writeFileSync(join(stage, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

  execSync("npm install --omit=dev --no-audit --no-fund --ignore-scripts", {
    cwd: stage,
    stdio: "inherit",
  });
  cpSync(join(stage, "node_modules"), join(out, "node_modules"), { recursive: true });

  // Produce a separate tarball that contains the AI package's node_modules
  // (flattened) so installers can remain light and later unpack the AI deps
  // without needing to run npm on the user's machine.
  const aiStage = join(out, "_ai_stage");
  rmSync(aiStage, { recursive: true, force: true });
  mkdirSync(aiStage, { recursive: true });
  // create a minimal package.json that depends only on the AI kit tarball
  const aiPkg = { name: "esti-ai-stage", version: "1.0.0", dependencies: { "@hcw/aorms-ai-kit": `file:${aiKitTgz}` } };
  writeFileSync(join(aiStage, "package.json"), `${JSON.stringify(aiPkg, null, 2)}\n`);
  console.log("• installing AI deps into temporary stage (this produces ai node_modules)");
  execSync("npm install --omit=dev --no-audit --no-fund --ignore-scripts", {
    cwd: aiStage,
    stdio: "inherit",
  });
  // Tar the resulting node_modules as an optional artifact the installer can unpack
  const installersDir = join(repo, "desktop", "dist-installers");
  mkdirSync(installersDir, { recursive: true });
  const aiTar = join(installersDir, "_ai_node_modules.tgz");
  try {
    execSync(`tar -czf "${aiTar}" -C "${aiStage}" node_modules`, { stdio: "inherit" });
  } catch {
    // On Windows without tar, try using PowerShell Compress-Archive as a fallback
    console.log("tar failed, trying PowerShell Compress-Archive fallback");
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${aiStage}\\node_modules\\*' -DestinationPath '${aiTar}'"`, { stdio: "inherit" });
  }
  // clean up the temporary aiStage
  rmSync(aiStage, { recursive: true, force: true });
  // remove staging area
  rmSync(stage, { recursive: true, force: true });

  // @esti/contracts ships dev-mode main/exports → ./src/index.ts (so tsx/Vite load
  // the TS source in the monorepo). The bundled sidecar runs plain Node, which can't
  // load .ts under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING) — repoint
  // it at the built JS (dist ships inside the pack).
  const contractsPkg = join(out, "node_modules", "@esti", "contracts", "package.json");
  if (existsSync(contractsPkg)) {
    const cj = JSON.parse(readFileSync(contractsPkg, "utf8"));
    cj.main = "./dist/index.js";
    cj.types = "./dist/index.d.ts";
    cj.exports = { ".": "./dist/index.js" };
    writeFileSync(contractsPkg, `${JSON.stringify(cj, null, 2)}\n`);
    console.log("• repointed @esti/contracts → dist/index.js");
  }

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
