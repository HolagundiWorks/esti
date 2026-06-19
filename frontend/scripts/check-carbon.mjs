import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLine } from "@hcw/carbon-agent-kit/policy";

const root = process.argv[2] ?? fileURLToPath(new URL("../src/", import.meta.url));

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const failures = [];
for (const path of files(root)) {
  if (![".ts", ".tsx", ".scss"].includes(extname(path))) continue;
  if (path.endsWith("carbon-policy.test.ts")) continue;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const reason = checkLine(path, line, index + 1);
    if (reason) failures.push(`${path}:${index + 1}: ${reason}`);
  });
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Carbon visual guard passed");
