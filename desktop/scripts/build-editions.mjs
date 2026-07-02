// Build all three AORMS desktop editions (Lite / Core / Enterprise) as NSIS
// installers. The frontend SPA and the Node backend sidecar are identical across
// editions, so they're assembled ONCE; only the Rust shell differs per edition
// (baked AORMS_EDITION → FIRM_PLAN) plus a distinct product name + identifier so
// the three can be installed side by side.
//
//   pnpm desktop:build-editions
//
// Output: desktop/dist-installers/AORMS-{Lite,Core,Enterprise}-Setup.exe
// Run on a NATIVE Windows checkout with its own `pnpm install` (see desktop/README.md).
import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONF = path.join(ROOT, "desktop/src-tauri/tauri.conf.json");
const NSIS = path.join(ROOT, "desktop/src-tauri/target/release/bundle/nsis");
const OUT = path.join(ROOT, "desktop/dist-installers");

const EDITIONS = [
  { code: "LITE", name: "AORMS Lite", id: "in.aorms.esti", out: "AORMS-Lite-Setup.exe" },
  { code: "CORE", name: "AORMS Core", id: "in.aorms.esti.core", out: "AORMS-Core-Setup.exe" },
  {
    code: "ENTERPRISE",
    name: "AORMS Enterprise",
    id: "in.aorms.esti.enterprise",
    out: "AORMS-Enterprise-Setup.exe",
  },
];

function sh(cmd, env) {
  console.log(`\n$ ${cmd}${env ? `   (${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(" ")})` : ""}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, env: { ...process.env, ...env } });
}

function newestSetupExe() {
  const files = readdirSync(NSIS).filter((f) => f.toLowerCase().endsWith("-setup.exe"));
  let best = null;
  let bestM = -1;
  for (const f of files) {
    const m = statSync(path.join(NSIS, f)).mtimeMs;
    if (m > bestM) {
      bestM = m;
      best = f;
    }
  }
  return best ? path.join(NSIS, best) : null;
}

const base = JSON.parse(readFileSync(CONF, "utf8"));

// Tauri icons are gitignored (generated). Regenerate from the committed app mark
// if absent, so a fresh clone builds — mirrors .github/workflows/desktop.yml.
if (!existsSync(path.join(ROOT, "desktop/src-tauri/icons/icon.ico"))) {
  console.log("== generating Tauri icons (none present) ==");
  sh("cargo tauri icon frontend/public/android-chrome-512x512.png -o desktop/src-tauri/icons");
}

if (process.env.SKIP_ASSEMBLE) {
  console.log("== SKIP_ASSEMBLE set — reusing the already-assembled frontend/dist + sidecar ==");
} else {
  console.log("== assembling shared frontend + backend sidecar (once) ==");
  sh("pnpm desktop:assemble");
}
mkdirSync(OUT, { recursive: true });

const results = [];
try {
  for (const e of EDITIONS) {
    console.log(`\n========== building ${e.name} (${e.code}) ==========`);
    const conf = JSON.parse(JSON.stringify(base));
    conf.productName = e.name;
    conf.identifier = e.id;
    if (conf.app?.windows?.[0]) conf.app.windows[0].title = e.name;
    writeFileSync(CONF, `${JSON.stringify(conf, null, 2)}\n`);

    // For CORE/ENTERPRISE, include the prebuilt AI node_modules tarball in the
    // staged resources so the installer can optionally unpack it at install-time.
    const resourcesBackend = path.join(ROOT, "desktop/src-tauri/resources/backend");
    const aiArtifact = path.join(ROOT, "desktop/dist-installers/_ai_node_modules.tgz");
    const destAi = path.join(resourcesBackend, "_ai_node_modules.tgz");
    // ensure resources dir exists
    try { mkdirSync(resourcesBackend, { recursive: true }); } catch { /* already exists */ }
    // remove any existing ai artifact from resources (so LITE remains clean)
    try { if (existsSync(destAi)) rmSync(destAi); } catch { /* best-effort */ }
    if (e.code !== "LITE" && existsSync(aiArtifact)) {
      copyFileSync(aiArtifact, destAi);
      console.log(`Included AI bundle for ${e.code} installer`);
    }

    const rel = path.relative(ROOT, CONF).replace(/\\/g, "/");
    sh(`cargo tauri build --config ${rel}`, { AORMS_EDITION: e.code });

    const exe = newestSetupExe();
    if (!exe) throw new Error(`no NSIS installer found for ${e.code} in ${NSIS}`);
    const dest = path.join(OUT, e.out);
    copyFileSync(exe, dest);
    results.push({ edition: e.code, src: path.basename(exe), dest });
    console.log(`-> ${path.basename(exe)}  →  ${dest}`);
  }
} finally {
  // Restore the committed (LITE-default) config no matter what.
  writeFileSync(CONF, `${JSON.stringify(base, null, 2)}\n`);
}

console.log("\n== installers ==");
for (const r of results) console.log(`  ${r.edition.padEnd(11)} ${r.dest}`);
