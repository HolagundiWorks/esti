import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("./", import.meta.url);

function files(dir: URL | string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(String(dir), entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

describe("Pure Carbon frontend policy", () => {
  it("contains no hard-coded visual values, decorative inline styles, or raw controls", () => {
    const violations: string[] = [];
    const rules = [
      /(?:#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{8})\b|rgba?\s*\(|linear-gradient|box-shadow)/i,
      /\b(?:color|background(?:Color)?|fontSize|fontWeight|border(?:Top|Right|Bottom|Left|Radius)?|boxShadow|letterSpacing|textTransform)\s*:/,
      /<(?:button|input|select|textarea)\b/,
    ];
    for (const path of files(root.pathname)) {
      if (![".ts", ".tsx", ".scss"].includes(extname(path)) || path.endsWith("carbon-policy.test.ts")) continue;
      const source = readFileSync(path, "utf8");
      if (rules.some((rule) => rule.test(source))) violations.push(path);
    }
    expect(violations).toEqual([]);
  });

  it("keeps both portals on Carbon responsive grids and keyboard-operable tiles", () => {
    for (const route of ["routes/Portal.tsx", "routes/CollaboratorPortal.tsx"]) {
      const source = readFileSync(new URL(route, root), "utf8");
      expect(source).toContain("<Grid>");
      expect(source).toContain("<Column");
      expect(source).toContain("<ClickableTile");
    }
  });
});
