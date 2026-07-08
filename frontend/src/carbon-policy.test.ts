import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLine } from "../scripts/carbon-policy-rules.mjs";

const root = new URL("./", import.meta.url);

function files(dir: URL | string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(String(dir), entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

describe("Pure Carbon frontend policy", () => {
  it("contains no hard-coded visual values, decorative inline styles, or raw controls in staff scope", () => {
    const violations: string[] = [];
    for (const path of files(root.pathname)) {
      if (![".ts", ".tsx", ".scss"].includes(extname(path))) continue;
      const source = readFileSync(path, "utf8");
      source.split(/\r?\n/).forEach((line, index) => {
        const reason = checkLine(path, line, index + 1);
        if (reason) violations.push(`${path}:${index + 1}: ${reason}`);
      });
    }
    expect(violations).toEqual([]);
  });

  // The portals migrated to MUI (HCW-UI-Kit): responsive Grid + keyboard-operable
  // CardActionArea replace Carbon's Grid/Column/ClickableTile.
  it("keeps both portals on MUI responsive grids and keyboard-operable cards", () => {
    for (const route of ["routes/Portal.tsx", "routes/CollaboratorPortal.tsx"]) {
      const source = readFileSync(new URL(route, root), "utf8");
      expect(source).toContain('from "@mui/material"');
      expect(source).toContain("<Grid");
      expect(source).toContain("<CardActionArea");
      expect(source).not.toContain("@carbon/react");
    }
  });
});
