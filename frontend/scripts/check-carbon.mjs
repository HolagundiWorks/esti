import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const root = process.argv[2] ?? new URL("../src/", import.meta.url);
const forbidden = [
  [/(?:#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})\b|rgba?\s*\(|linear-gradient|box-shadow)/i, "hard-coded visual value"],
  [/\b(?:color|background(?:Color)?|fontSize|fontWeight|border(?:Top|Right|Bottom|Left|Radius)?|boxShadow|letterSpacing|textTransform)\s*:/, "decorative inline style"],
  [/<(?:button|input|select|textarea)\b/, "raw form/control element"],
];

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
    for (const [pattern, reason] of forbidden) {
      if (pattern.test(line)) failures.push(`${path}:${index + 1}: ${reason}`);
    }
  });
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Carbon visual guard passed");
