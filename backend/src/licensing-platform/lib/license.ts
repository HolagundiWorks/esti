import {
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  type KeyObject,
} from "node:crypto";
import {
  LicenseTokenPayload,
  type LicenseTokenPayload as TokenPayload,
} from "@esti/contracts";

/**
 * License-token signing + verification for the panel (the sole issuer).
 *
 * The **public key is embedded** (committed) so every product verifies offline
 * against it. Only the panel holds the matching private key (env
 * `LICENSE_SIGNING_KEY` / `LICENSE_SIGNING_KEY_FILE`, never committed) and signs.
 *
 * Token format: `base64url(JSON payload).base64url(Ed25519 signature)`.
 *
 * Key rotation: regenerate an Ed25519 keypair, replace the constant below with
 * the new SPKI-DER (base64) public key, and set the new PKCS8 PEM as the signing
 * key. Products embedding the old public key must be updated to the new one.
 */
const PANEL_PUBLIC_KEY_SPKI_DER_B64 =
  "MCowBQYDK2VwAyEA66A1kjGLoHXX6TWOgyUlQPv394xT9SJ+bjDSNsoxenk=";

let cachedPublicKey: KeyObject | null = null;
function publicKey(): KeyObject {
  if (!cachedPublicKey) {
    cachedPublicKey = createPublicKey({
      key: Buffer.from(PANEL_PUBLIC_KEY_SPKI_DER_B64, "base64"),
      format: "der",
      type: "spki",
    });
  }
  return cachedPublicKey;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: string };

/** Verify a license token against the embedded public key. Pure / offline. */
export function verifyToken(token: string | null | undefined): VerifyResult {
  if (!token) return { ok: false, reason: "missing" };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return { ok: false, reason: "malformed" };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const parsed = LicenseTokenPayload.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid payload" };

  let signatureOk = false;
  try {
    // Ed25519: the algorithm arg must be null; the signature covers the exact
    // base64url(payload) bytes the signer produced.
    signatureOk = edVerify(
      null,
      Buffer.from(payloadB64),
      publicKey(),
      Buffer.from(sigB64, "base64url"),
    );
  } catch {
    return { ok: false, reason: "bad signature" };
  }
  if (!signatureOk) return { ok: false, reason: "bad signature" };
  return { ok: true, payload: parsed.data };
}

/**
 * Sign a license-token payload (ISSUER ONLY — requires the private key).
 * `privateKeyPem` is the PKCS8 PEM. Throws if the payload is invalid or the key
 * is unusable.
 */
export function signToken(payload: TokenPayload, privateKeyPem: string): string {
  const valid = LicenseTokenPayload.parse(payload);
  const payloadB64 = Buffer.from(JSON.stringify(valid), "utf8").toString("base64url");
  const key = createPrivateKey(privateKeyPem);
  const sig = edSign(null, Buffer.from(payloadB64), key);
  return `${payloadB64}.${sig.toString("base64url")}`;
}
