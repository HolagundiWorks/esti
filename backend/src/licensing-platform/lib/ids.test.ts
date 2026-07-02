import { describe, expect, it } from "vitest";
import { newPublicId } from "./ids.js";

describe("newPublicId", () => {
  // AORMS-U / AORMS-C portable handles: Crockford base32, no ambiguous I/L/O/U.
  const CROCKFORD = /^AORMS-(U|C)-[0-9A-HJKMNP-TV-Z]{6}$/;

  it("formats a personal (U) handle", () => {
    expect(newPublicId("U")).toMatch(CROCKFORD);
  });

  it("formats a company (C) handle", () => {
    expect(newPublicId("C")).toMatch(CROCKFORD);
  });

  it("never emits ambiguous letters I/L/O/U in the body", () => {
    for (let i = 0; i < 200; i++) {
      const body = newPublicId("U").replace("AORMS-U-", "");
      expect(body).not.toMatch(/[ILOU]/);
    }
  });

  it("is effectively unique across many draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(newPublicId("C"));
    expect(seen.size).toBe(1000);
  });
});
