// Package the Manager's downloadable components (Phase 6).
//
// The desktop app is a thin Manager that pulls its payload online. This script
// turns the already-staged backend (from `desktop:bundle-backend`) and the
// build host's Node runtime into hashed `.tar.gz` components, and emits a
// `components.json` descriptor. `publish-components.mjs` then uploads the files
// (Release assets) and registers a component release on the hub, filling in the
// download URLs.
//
// Layout each component unpacks to (matches src/provision + backend_launch):
//   backend/ → dist/, node_modules/, drizzle/   (kind: core)
//   node/    → node[.exe]                        (kind: core)
//
// Usage: node desktop/scripts/package-components.mjs [--version X.Y.Z]

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const stagedBackend = join(repo, "desktop", "src-tauri", "resources", "backend");
const outDir = join(repo, "desktop", "dist-components");

function version() {
  const i = process.argv.indexOf("--version");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const conf = JSON.parse(readFileSync(join(repo, "desktop", "src-tauri", "tauri.conf.json"), "utf8"));
  return conf.version || "0.0.0";
}

/** gzip'd tar of `srcDir`'s CONTENTS (entries at the archive root). */
function tarGz(srcDir, outFile) {
  // bsdtar ships on windows-latest, macOS, and Linux runners — portable gzip'd tar.
  execFileSync("tar", ["-czf", outFile, "-C", srcDir, "."], { stdio: "inherit" });
}

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function component(id, kind, file) {
  return {
    id,
    version: version(),
    kind,
    file: file.split("/").pop(),
    sha256: sha256(file),
    sizeBytes: statSync(file).size,
  };
}

function main() {
  const v = version();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const components = [];

  // 1) backend component — the staged dist + node_modules + drizzle.
  if (!existsSync(join(stagedBackend, "dist", "index.js"))) {
    throw new Error("staged backend not found — run `pnpm desktop:bundle-backend` first");
  }
  const backendTar = join(outDir, `backend-${v}.tar.gz`);
  tarGz(stagedBackend, backendTar);
  components.push(component("backend", "core", backendTar));

  // 2) node component — the build host's Node runtime (self-contained node[.exe]).
  const nodeBin = process.execPath;
  const nodeName = nodeBin.endsWith(".exe") ? "node.exe" : "node";
  const nodeStage = join(outDir, "_node");
  rmSync(nodeStage, { recursive: true, force: true });
  mkdirSync(nodeStage, { recursive: true });
  copyFileSync(nodeBin, join(nodeStage, nodeName));
  const nodeTar = join(outDir, `node-${v}.tar.gz`);
  tarGz(nodeStage, nodeTar);
  rmSync(nodeStage, { recursive: true, force: true });
  components.push(component("node", "core", nodeTar));

  // (Pro AI component — Ollama + model — is added in a later slice.)

  const descriptor = { appVersion: v, editions: { LITE: ["backend", "node"], PRO: ["backend", "node"] }, components };
  writeFileSync(join(outDir, "components.json"), `${JSON.stringify(descriptor, null, 2)}\n`);
  console.log(`Packaged ${components.length} components for ${v} → ${outDir}`);
  for (const c of components) console.log(`  • ${c.id} ${c.file} ${(c.sizeBytes / 1e6).toFixed(1)}MB ${c.sha256.slice(0, 12)}…`);
}

main();
