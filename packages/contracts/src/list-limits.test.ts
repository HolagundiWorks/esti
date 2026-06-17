import { describe, expect, it } from "vitest";
import { LIST_LIMIT_DEFAULT, LIST_LIMIT_MAX, clampListLimit } from "./list-limits.js";

describe("clampListLimit", () => {
  it("uses default when unset", () => {
    expect(clampListLimit()).toBe(LIST_LIMIT_DEFAULT);
    expect(clampListLimit(0)).toBe(LIST_LIMIT_DEFAULT);
  });

  it("caps at LIST_LIMIT_MAX", () => {
    expect(clampListLimit(LIST_LIMIT_MAX + 1)).toBe(LIST_LIMIT_MAX);
  });
});
