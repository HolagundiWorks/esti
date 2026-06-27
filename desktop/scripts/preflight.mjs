/**
 * Desktop build preflight — fails fast with actionable guidance instead of a
 * cryptic mid-build error.
 *
 * The #1 gotcha: this repo's `node_modules` is often a **Linux install** that is
 * bind-mounted into the podman dev containers (POSIX `.bin` shims, Linux-ELF
 * native addons). On a Windows/macOS host that install cannot build (the package
 * scripts shell out to `tsc`/`vite` via `.cmd`/native shims that don't exist) and
 * the bundled backend sidecar's native addons (`@node-rs/argon2`) are the wrong
 * platform. Reinstalling in place would clobber the containers' `node_modules`.
 *
 * The desktop installer must be built on a host with its own native `pnpm
 * install` (a separate checkout, or CI). See desktop/README.md → "Build host".
 *
 * Run standalone with `pnpm desktop:doctor`; it also gates `desktop:assemble`.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
const nm = join(repo, "node_modules");

const problems = [];
const ok = [];

function has(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ── 1. Toolchain ────────────────────────────────────────────────────────────
for (const [name, cmd] of [
  ["Node", "node"],
  ["pnpm", "pnpm"],
  ["Rust (cargo)", "cargo"],
]) {
  if (has(cmd)) ok.push(`${name} present`);
  else problems.push(`${name} not found on PATH (\`${cmd}\`).`);
}
// tauri-cli is invoked as `cargo tauri`
try {
  execSync("cargo tauri --version", { stdio: "ignore" });
  ok.push("tauri-cli present");
} catch {
  problems.push("tauri-cli not found — `cargo install tauri-cli` (2.x).");
}

// ── 2. node_modules present ───────────────────────────────────────────────────
if (!existsSync(nm)) {
  problems.push("node_modules is missing — run a full `pnpm install` on this host first.");
}

// ── 3. node_modules platform matches this host ────────────────────────────────
const bin = join(nm, ".bin");
if (process.platform === "win32" && existsSync(bin)) {
  const shims = readdirSync(bin);
  const hasCmd = shims.some((f) => f.toLowerCase().endsWith(".cmd"));
  if (!hasCmd && shims.length > 0) {
    problems.push(
      "node_modules/.bin has only POSIX shims, no Windows .cmd shims — this is a Linux/container `pnpm install` (likely bind-mounted into the podman dev stack). " +
        "Package builds will fail with \"'tsc' is not recognized\", and reinstalling here would break the containers. Build on a separate native Windows checkout.",
    );
  } else if (hasCmd) {
    ok.push("node_modules has Windows (.cmd) shims");
  }
}

// ── 4. Bundled sidecar's native addon matches this host ───────────────────────
const pnpmDir = join(nm, ".pnpm");
if (existsSync(pnpmDir)) {
  const argon = readdirSync(pnpmDir).filter((e) => e.startsWith("@node-rs+argon2-"));
  if (argon.length > 0) {
    const want = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const hostNative = argon.some((e) => e.includes(want));
    const platforms = [...new Set(argon.map((a) => a.replace("@node-rs+argon2-", "").split("@")[0]))];
    if (!hostNative) {
      problems.push(
        `@node-rs/argon2 prebuilt is installed for [${platforms.join(", ")}] but not for this host (${process.platform}). ` +
          "The bundled backend sidecar would crash on launch. Install dependencies on a native " +
          `${process.platform} host.`,
      );
    } else {
      ok.push(`@node-rs/argon2 native present for ${process.platform}`);
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
for (const o of ok) console.log(`  ✓ ${o}`);
if (problems.length > 0) {
  console.error("\n✖ Desktop build preflight failed:\n");
  for (const p of problems) console.error(`  • ${p}\n`);
  console.error(
    "Fix: build the desktop installer on a host with its own native `pnpm install`\n" +
      "(a separate checkout or CI — NOT the container-shared repo). See desktop/README.md → Build host.\n",
  );
  process.exit(1);
}
console.log("\n✓ Desktop build preflight passed — host can build the installer.\n");
