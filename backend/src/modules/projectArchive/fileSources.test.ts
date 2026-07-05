import { describe, expect, it } from "vitest";
import { computeFileSet } from "./fileSources.js";

describe("project archive — file-set exclusivity", () => {
  it("dedupes the project's own keys", () => {
    const { keys } = computeFileSet(["a", "a", "b"], []);
    expect(keys.sort()).toEqual(["a", "b"]);
  });

  it("marks keys removable only when no other project references them", () => {
    // 'shared' is used by another project (content-addressed) → must NOT be removed.
    const { keys, removableKeys } = computeFileSet(["own1", "own2", "shared"], ["shared", "elsewhere"]);
    expect(keys.sort()).toEqual(["own1", "own2", "shared"]);
    expect(removableKeys.sort()).toEqual(["own1", "own2"]);
  });

  it("removes everything when nothing is shared", () => {
    expect(computeFileSet(["x", "y"], []).removableKeys.sort()).toEqual(["x", "y"]);
  });

  it("removes nothing when every key is shared", () => {
    expect(computeFileSet(["x", "y"], ["x", "y", "z"]).removableKeys).toEqual([]);
  });
});
