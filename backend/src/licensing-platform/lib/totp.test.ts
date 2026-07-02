import { describe, expect, it } from "vitest";
import { generateTotpSecret, otpauthUri, totpCode, verifyTotp } from "./totp.js";

// RFC 6238 Appendix B seed "12345678901234567890" (ASCII) → base32.
function b32(ascii: string): string {
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const buf = Buffer.from(ascii);
  let bits = 0, value = 0, out = "";
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
const SEED = b32("12345678901234567890");

describe("totp (RFC 6238)", () => {
  it("matches the RFC known-answer at T=59s (6-digit truncation of 94287082)", () => {
    expect(totpCode(SEED, 59_000)).toBe("287082");
  });

  it("verifies the code generated for the current step", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totpCode(secret, now), 1, now)).toBe(true);
  });

  it("rejects a wrong code and a code from far outside the window", () => {
    const secret = generateTotpSecret();
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, "000000", 1, now)).toBe(false);
    // a code from 10 steps ago (300s) is outside the ±1 window
    expect(verifyTotp(secret, totpCode(secret, now - 300_000), 1, now)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "abcdef")).toBe(false);
  });

  it("builds an otpauth URI with issuer + secret", () => {
    const uri = otpauthUri("ABC234", "admin@aorms.in");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain("secret=ABC234");
    expect(uri).toContain("issuer=AORMS");
  });
});
