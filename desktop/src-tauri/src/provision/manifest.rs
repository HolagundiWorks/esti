//! Component manifest: fetch from the hub and verify its signature.
//!
//! The Manager never trusts a downloaded artifact without (a) a valid Ed25519
//! signature over the manifest, from the same key that signs licence tokens,
//! and (b) a per-artifact SHA-256 match (see `download.rs`). The public key is
//! embedded (identical to the backend's `PANEL_PUBLIC_KEY_SPKI_DER_B64`), so
//! verification is fully offline.

use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Deserialize;

/// Panel signing public key — SPKI-DER, base64. MUST match the backend's
/// `licensing-platform/lib/license.ts` constant. Rotating the key means
/// updating both places (and re-releasing the Manager).
const PANEL_PUBLIC_KEY_SPKI_DER_B64: &str =
    "MCowBQYDK2VwAyEA66A1kjGLoHXX6TWOgyUlQPv394xT9SJ+bjDSNsoxenk=";

/// One downloadable artifact. Mirrors the contracts `ManifestComponent`.
#[derive(Debug, Clone, Deserialize)]
pub struct ManifestComponent {
    pub id: String,
    pub version: String,
    /// "core" | "ai" | "worker".
    pub kind: String,
    pub url: String,
    /// Lowercase hex SHA-256 of the artifact.
    pub sha256: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
}

/// The full component set for an edition. Mirrors the contracts `ComponentManifest`.
#[derive(Debug, Clone, Deserialize)]
pub struct ComponentManifest {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub edition: String,
    #[serde(rename = "appVersion")]
    pub app_version: String,
    #[serde(rename = "issuedAt")]
    pub issued_at: String,
    pub components: Vec<ManifestComponent>,
}

/// Extract the raw 32-byte Ed25519 key from its 44-byte SPKI-DER encoding
/// (12-byte fixed prefix + 32-byte key).
fn verifying_key() -> Result<VerifyingKey, String> {
    let der = base64::engine::general_purpose::STANDARD
        .decode(PANEL_PUBLIC_KEY_SPKI_DER_B64)
        .map_err(|e| format!("bad embedded key b64: {e}"))?;
    if der.len() != 44 {
        return Err(format!("unexpected SPKI length {}", der.len()));
    }
    let raw: [u8; 32] = der[12..44]
        .try_into()
        .map_err(|_| "key slice not 32 bytes".to_string())?;
    VerifyingKey::from_bytes(&raw).map_err(|e| format!("bad key bytes: {e}"))
}

/// Verify a signed manifest token (`base64url(payload).base64url(sig)`) against
/// the embedded key and parse it. Rejects any tampering or wrong-key signature.
pub fn verify_manifest(signed: &str) -> Result<ComponentManifest, String> {
    let (payload_b64, sig_b64) = signed.split_once('.').ok_or("malformed token")?;
    if payload_b64.is_empty() || sig_b64.is_empty() {
        return Err("malformed token".into());
    }
    let url_safe = base64::engine::general_purpose::URL_SAFE_NO_PAD;
    let sig_bytes = url_safe
        .decode(sig_b64)
        .map_err(|e| format!("bad signature b64: {e}"))?;
    let sig = Signature::from_slice(&sig_bytes).map_err(|e| format!("bad signature: {e}"))?;

    // Ed25519 signs the exact base64url(payload) ASCII bytes (matches signManifest).
    verifying_key()?
        .verify_strict(payload_b64.as_bytes(), &sig)
        .map_err(|_| "signature verification failed".to_string())?;

    let payload_json = url_safe
        .decode(payload_b64)
        .map_err(|e| format!("bad payload b64: {e}"))?;
    let manifest: ComponentManifest =
        serde_json::from_slice(&payload_json).map_err(|e| format!("bad manifest json: {e}"))?;
    if manifest.schema_version != 1 {
        return Err(format!("unsupported manifest schema {}", manifest.schema_version));
    }
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_key_is_valid_ed25519() {
        // The embedded SPKI-DER must decode to a usable verifying key.
        assert!(verifying_key().is_ok());
    }

    #[test]
    fn rejects_malformed_tokens() {
        for bad in ["", "nodot", ".x", "x.", "onlypayload"] {
            assert!(verify_manifest(bad).is_err(), "should reject {bad:?}");
        }
    }

    #[test]
    fn rejects_wrong_key_and_tampered_signature() {
        // A syntactically valid token whose signature isn't from the panel key
        // must fail (payload + a random 64-byte signature, both base64url).
        let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(
            br#"{"schemaVersion":1,"edition":"PRO","appVersion":"1","issuedAt":"t","components":[]}"#,
        );
        let fake_sig = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode([7u8; 64]);
        assert!(verify_manifest(&format!("{payload}.{fake_sig}")).is_err());
    }
}

#[derive(serde::Serialize)]
struct ManifestReq<'a> {
    #[serde(rename = "licenseKey")]
    license_key: &'a str,
}

#[derive(Deserialize)]
struct ManifestResp {
    signed: String,
}

/// Ask the hub for this licence's manifest and return the verified result.
/// `hub_base` is e.g. `https://aorms.in/platform`; `product_key` is the machine
/// API key; `license_key` is the customer's licence.
pub async fn fetch_manifest(
    hub_base: &str,
    product_key: &str,
    license_key: &str,
) -> Result<ComponentManifest, String> {
    let url = format!("{}/v1/manifest", hub_base.trim_end_matches('/'));
    let resp = reqwest::Client::new()
        .post(&url)
        .bearer_auth(product_key)
        .json(&ManifestReq { license_key })
        .send()
        .await
        .map_err(|e| format!("manifest request failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("manifest request status {}", resp.status()));
    }
    let body: ManifestResp = resp
        .json()
        .await
        .map_err(|e| format!("manifest response decode failed: {e}"))?;
    verify_manifest(&body.signed)
}
