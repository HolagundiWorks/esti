#!/usr/bin/env node
/**
 * Link @hcw/carbon-agent-kit for agents and install Cursor rules.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";

const estiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const kitRoot = join(estiRoot, "node_modules", "@hcw", "carbon-agent-kit");
const linkPath = join(estiRoot, ".carbon-kit");

if (!existsSync(kitRoot)) {
  console.warn("setup-carbon-kit: @hcw/carbon-agent-kit not installed — skip");
  process.exit(0);
}

try {
  if (existsSync(linkPath)) {
    rmSync(linkPath, { recursive: true, force: true });
  }
  symlinkSync(kitRoot, linkPath, "junction");
  console.log("Linked .carbon-kit -> @hcw/carbon-agent-kit");
} catch (err) {
  console.warn("Junction failed, copying kit to .carbon-kit:", err);
  cpSync(kitRoot, linkPath, { recursive: true });
}

const installRules = join(kitRoot, "scripts", "install-cursor-rules.mjs");
if (existsSync(installRules)) {
  execSync(`node "${installRules}" "${estiRoot}"`, { stdio: "inherit" });
}
