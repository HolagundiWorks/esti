#!/usr/bin/env node
/** Print top-level package licenses for release audit. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgs = ["backend", "frontend", "packages/contracts"];

for (const p of pkgs) {
  const pkg = JSON.parse(readFileSync(join(root, p, "package.json"), "utf8"));
  console.log(`${pkg.name ?? p}: ${pkg.license ?? "UNLICENSED"} (${pkg.version ?? "?"})`);
}

console.log("\nWorker: see worker/pyproject.toml — MIT (project dependencies vary).");
