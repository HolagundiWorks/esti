import { generateKeyPairSync, verify as edVerify } from "node:crypto";
import type { ComponentManifest } from "@esti/contracts";
import { describe, expect, it } from "vitest";
import { signManifest, verifyManifest } from "./license.js";

function testKeypair() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    pem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey,
  };
}

const MANIFEST: ComponentManifest = {
  schemaVersion: 1,
  edition: "PRO",
  appVersion: "2026.7.0",
  issuedAt: "2026-07-02T00:00:00.000Z",
  components: [
    {
      id: "backend",
      version: "2026.7.0",
      kind: "core",
      url: "https://example.com/backend.tar.gz",
      sha256: "a".repeat(64),
      sizeBytes: 12345,
    },
    {
      id: "ollama",
      version: "0.3.0",
      kind: "ai",
      url: "https://example.com/ollama.zip",
      sha256: "b".repeat(64),
      sizeBytes: 999,
    },
  ],
};

describe("component manifest signing", () => {
  it("signs a manifest as base64url(payload).base64url(sig) that round-trips + verifies under its key", () => {
    const { pem, publicKey } = testKeypair();
    const token = signManifest(MANIFEST, pem);

    const dot = token.indexOf(".");
    expect(dot).toBeGreaterThan(0);
    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);

    // Payload decodes back to the exact manifest.
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    expect(decoded).toEqual(MANIFEST);

    // Signature covers the base64url(payload) bytes under the signing key.
    const sigOk = edVerify(null, Buffer.from(payloadB64), publicKey, Buffer.from(sigB64, "base64url"));
    expect(sigOk).toBe(true);
  });

  it("rejects an invalid manifest shape at signing time", () => {
    const { pem } = testKeypair();
    // @ts-expect-error — deliberately malformed (bad sha256 length)
    expect(() => signManifest({ ...MANIFEST, components: [{ ...MANIFEST.components[0], sha256: "short" }] }, pem)).toThrow();
  });

  it("verifyManifest rejects missing / malformed / tampered tokens", () => {
    const { pem } = testKeypair();
    expect(verifyManifest(null).ok).toBe(false);
    expect(verifyManifest("").ok).toBe(false);
    expect(verifyManifest("nodot").ok).toBe(false);
    expect(verifyManifest(".x").ok).toBe(false);

    // A well-formed token signed by a NON-panel key must fail signature check
    // against the embedded panel public key.
    const token = signManifest(MANIFEST, pem);
    const res = verifyManifest(token);
    expect(res.ok).toBe(false);

    // Tampering the payload also fails.
    const dot = token.indexOf(".");
    const tampered = `${token.slice(0, dot).slice(0, -1)}X${token.slice(dot)}`;
    expect(verifyManifest(tampered).ok).toBe(false);
  });
});
