import { describe, expect, it } from "vitest";
import { redactPii } from "./redact.js";

describe("redactPii", () => {
  it("redacts email and phone", () => {
    const out = redactPii("Contact owner@hcw.in or +91 9876543210");
    expect(out).not.toContain("owner@hcw.in");
    expect(out).toContain("[email redacted]");
  });
});
