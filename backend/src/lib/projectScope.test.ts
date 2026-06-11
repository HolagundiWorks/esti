import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { requireAllScopedIds, requireMatchingProjectClient } from "./projectScope.js";

describe("project scope validation", () => {
  it("accepts an omitted or matching project client", () => {
    expect(() => requireMatchingProjectClient("client-1")).not.toThrow();
    expect(() => requireMatchingProjectClient("client-1", "client-1")).not.toThrow();
  });

  it("rejects an invoice client outside the project", () => {
    expect(() => requireMatchingProjectClient("client-1", "client-2")).toThrowError(
      expect.objectContaining<Partial<TRPCError>>({ code: "BAD_REQUEST" }),
    );
    expect(() => requireMatchingProjectClient(null, "client-2")).toThrowError(
      "Client does not belong to the selected project",
    );
  });

  it("accepts a complete scoped ID set regardless of duplicates or order", () => {
    expect(() => requireAllScopedIds(["a", "b", "a"], ["b", "a"], "invalid")).not.toThrow();
  });

  it("rejects missing or unexpected scoped IDs", () => {
    expect(() => requireAllScopedIds(["a", "b"], ["a"], "invalid scope")).toThrowError(
      "invalid scope",
    );
    expect(() => requireAllScopedIds(["a"], ["a", "b"], "invalid scope")).toThrowError(
      "invalid scope",
    );
  });
});
