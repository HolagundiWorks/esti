import { describe, expect, it } from "vitest";
import { isSealed, openSecret, sealSecret } from "./secretBox.js";

describe("secretBox", () => {
  it("round-trips a secret", () => {
    const sealed = sealSecret("sk-test-1234567890");
    expect(isSealed(sealed)).toBe(true);
    expect(sealed).not.toContain("sk-test");
    expect(openSecret(sealed)).toBe("sk-test-1234567890");
  });

  it("produces a distinct ciphertext per call (random IV)", () => {
    expect(sealSecret("same")).not.toBe(sealSecret("same"));
  });

  it("passes legacy plaintext through unchanged", () => {
    expect(isSealed("sk-legacy-plain")).toBe(false);
    expect(openSecret("sk-legacy-plain")).toBe("sk-legacy-plain");
  });

  it("throws when the ciphertext is tampered with", () => {
    const sealed = sealSecret("secret");
    const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => openSecret(tampered)).toThrow();
  });
});
