import {
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  verify as edVerify,
  type KeyObject,
} from "node:crypto";
import {
  LicensePayload,
  PLAN_LIMITS,
  type LicensePayload as License,
  type ResolvedSeats,
} from "@esti/contracts";

/**
 * License token verification + signing (Phase B).
 *
 * The **public key is embedded** (committed) so every install verifies offline.
 * Only the central hub holds the matching private key (env `LICENSE_SIGNING_KEY`,
 * never in the repo) and is allowed to call {@link signLicense}.
 *
 * To rotate keys for production: regenerate an Ed25519 keypair, replace the
 * constant below with the new SPKI-DER (base64) public key, and set the new
 * PKCS8 PEM private key as `LICENSE_SIGNING_KEY` on the hub. See desktop/docs.
 */
const LICENSE_PUBLIC_KEY_SPKI_DER_B64 =
  "MCowBQYDK2VwAyEAFElwr3kykYS93ViA5OgmO16JbyKxu1axrXkbq1F1qhs=";

let cachedPublicKey: KeyObject | null = null;
function publicKey(): KeyObject {
  if (!cachedPublicKey) {
    cachedPublicKey = createPublicKey({
      key: Buffer.from(LICENSE_PUBLIC_KEY_SPKI_DER_B64, "base64"),
      format: "der",
      type: "spki",
    });
  }
  return cachedPublicKey;
}

export type VerifyResult =
  | { ok: true; payload: License }
  | { ok: false; reason: string };

/** Verify a license token against the embedded public key. Pure / offline. */
export function verifyLicense(token: string | null | undefined): VerifyResult {
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
  const parsed = LicensePayload.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "invalid payload" };

  let signatureOk = false;
  try {
    // Ed25519: algorithm arg must be null; the signature covers the exact
    // base64url(payload) bytes that the signer produced.
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
 * Sign a license payload (HUB ONLY — requires the private key). `privateKeyPem`
 * is the PKCS8 PEM from env `LICENSE_SIGNING_KEY`. Throws if the payload is
 * invalid or the key is unusable.
 */
export function signLicense(payload: License, privateKeyPem: string): string {
  const valid = LicensePayload.parse(payload);
  const payloadB64 = Buffer.from(JSON.stringify(valid), "utf8").toString("base64url");
  const key = createPrivateKey(privateKeyPem);
  const sig = edSign(null, Buffer.from(payloadB64), key);
  return `${payloadB64}.${sig.toString("base64url")}`;
}

/** Apply a license's optional seat overrides onto the plan's default caps. */
export function resolveSeats(payload: License): ResolvedSeats {
  const base = PLAN_LIMITS[payload.plan];
  const s = payload.seats ?? {};
  // `undefined` → plan default; an explicit value (incl. null = unlimited) wins.
  return {
    staff: s.staff === undefined ? base.staff : s.staff,
    accountants: s.accountants === undefined ? base.accountants : s.accountants,
    hrManagers: s.hrManagers === undefined ? base.hrManagers : s.hrManagers,
  };
}
