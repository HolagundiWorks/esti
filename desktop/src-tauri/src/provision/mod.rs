//! Manager provisioning: turn a licence into a verified, on-disk payload set.
//!
//! Flow: fetch the signed component manifest for the licence's edition → verify
//! its Ed25519 signature → download each component and verify its SHA-256 into
//! the payload store. LITE pulls only `core` components; PRO also pulls `ai`
//! (and later `worker`). Nothing downloaded is trusted until both the manifest
//! signature and the per-file hash check pass.

pub mod download;
pub mod manifest;

use std::path::{Path, PathBuf};

use manifest::{ComponentManifest, ManifestComponent};

/// A component that has been downloaded and hash-verified on disk.
#[derive(Debug, Clone)]
pub struct ProvisionedComponent {
    pub id: String,
    pub kind: String,
    pub path: PathBuf,
}

/// Fetch + verify the manifest, then download + verify every component into
/// `store` (the payload directory under app data). Returns the on-disk set.
pub async fn provision(
    hub_base: &str,
    product_key: &str,
    license_key: &str,
    store: &Path,
) -> Result<Vec<ProvisionedComponent>, String> {
    let manifest = manifest::fetch_manifest(hub_base, product_key, license_key).await?;
    provision_manifest(&manifest, store).await
}

/// Download + verify the components of an already-verified manifest.
pub async fn provision_manifest(
    manifest: &ComponentManifest,
    store: &Path,
) -> Result<Vec<ProvisionedComponent>, String> {
    let dir = store.join(&manifest.app_version);
    let mut out = Vec::with_capacity(manifest.components.len());
    for c in &manifest.components {
        let path = download::download_and_verify(c, &dir).await?;
        out.push(ProvisionedComponent {
            id: c.id.clone(),
            kind: c.kind.clone(),
            path,
        });
    }
    Ok(out)
}

/// Whether a manifest component belongs to this edition's install. LITE takes
/// only `core`; PRO takes everything. (Defensive — the hub already scopes the
/// manifest by edition, but the Manager double-checks.)
pub fn kind_allowed(edition: &str, component: &ManifestComponent) -> bool {
    match edition {
        "LITE" => component.kind == "core",
        _ => true,
    }
}
