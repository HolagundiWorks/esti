import { describe, expect, it } from "vitest";
import { redactPii } from "./redact.js";

describe("redactPii", () => {
  it("redacts email and phone", () => {
    const out = redactPii("Contact owner@hcw.in or +91 9876543210");
    expect(out).not.toContain("owner@hcw.in");
    expect(out).toContain("[email redacted]");
  });

  it("redacts every common Indian phone format, including +91 with no separator", () => {
    for (const raw of ["+919845012345", "+91 9845012345", "+91-9845012345", "9845012345", "919845012345"]) {
      const out = redactPii(`call ${raw} today`);
      expect(out, raw).toBe("call [phone redacted] today");
    }
  });

  it("does not redact non-phone digit runs", () => {
    // 12-digit invoice/order number — no 10-digit phone should be matched inside it.
    expect(redactPii("Order 123456789012 shipped")).toBe("Order 123456789012 shipped");
  });
});
