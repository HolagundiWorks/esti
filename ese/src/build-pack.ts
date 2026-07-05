/**
 * build-pack — CLI that turns a source markdown into a committed Rate Library
 * Pack JSON. Deterministic: same markdown → byte-identical pack (key-sorted,
 * content-addressed seal). This is how a pack is regenerated when a source's
 * markdown or parser changes.
 *
 *   pnpm --filter @esti/ese build-pack -- \
 *     --source KAR-PWD --year 2023 \
 *     --in samples/kar-dsr-2023.md --out packs/kar-pwd-2023.pack.json
 *
 * Defaults: if --in/--out are omitted they are derived from the source key.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildPack } from "./pipeline.js";
import { getSource } from "./registry.js";
import { stablePretty } from "./pack-checksum.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const sourceKey = arg("source") ?? "KAR-PWD";
  const src = getSource(sourceKey);
  const year = Number(arg("year") ?? src.defaultYear);
  const inPath = resolve(arg("in") ?? `samples/${sourceKey.toLowerCase().replace("-pwd", "")}-dsr-${year}.md`);
  const outPath = resolve(arg("out") ?? `packs/${sourceKey.toLowerCase()}-${year}.pack.json`);

  const markdown = readFileSync(inPath, "utf8");
  const pack = buildPack(sourceKey, markdown, { year });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, stablePretty(pack));

  process.stdout.write(
    `✅ ${src.label} → ${outPath}\n` +
      `   edition ${pack.edition} · checksum ${pack.checksum.slice(0, 16)}…\n` +
      `   ${pack.rateItems.length} rate items · ${pack.materials.length} materials · ` +
      `${pack.recipes.length} recipes · ${pack.workItems.length} work items\n`,
  );
}

main();
