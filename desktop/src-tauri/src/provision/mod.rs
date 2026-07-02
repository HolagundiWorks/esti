//! Manager provisioning: turn a licence into a verified, on-disk payload set.
//!
//! Flow: fetch the signed component manifest for the licence's edition → verify
//! its Ed25519 signature → download each component and verify its SHA-256 into
//! the payload store. LITE pulls only `core` components; PRO also pulls `ai`
//! (and later `worker`). Nothing downloaded is trusted until both the manifest
//! signature and the per-file hash check pass.

pub mod download;
pub mod manifest;
pub mod unpack;

use std::path::{Path, PathBuf};

use manifest::{ComponentManifest, ManifestComponent};

/// A component that has been downloaded, hash-verified, and (if an archive)
/// unpacked on disk.
#[derive(Debug, Clone)]
pub struct ProvisionedComponent {
    pub id: String,
    pub kind: String,
    /// The unpacked component directory (for archives) or the artifact file
    /// itself (for bare blobs like an AI model).
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
    let version_dir = store.join(&manifest.app_version);
    let downloads = version_dir.join("_dl");
    let mut out = Vec::with_capacity(manifest.components.len());
    for c in &manifest.components {
        let artifact = download::download_and_verify(c, &downloads).await?;
        // Archives unpack into <version>/<id>/; bare blobs are used in place.
        let path = if unpack::is_archive(&c.url) {
            let dest = version_dir.join(&c.id);
            unpack::unpack_tar_gz(&artifact, &dest)?;
            dest
        } else {
            artifact
        };
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

/// Find a provisioned component by id.
pub fn find<'a>(components: &'a [ProvisionedComponent], id: &str) -> Option<&'a ProvisionedComponent> {
    components.iter().find(|c| c.id == id)
}

/// Locate the backend launch pair — (node runtime binary, entry script) — from a
/// provisioned set. Returns None if either the `node` or `backend` component is
/// missing. The node binary name is OS-specific.
pub fn backend_launch(components: &[ProvisionedComponent]) -> Option<(PathBuf, PathBuf)> {
    let node = find(components, "node")?;
    let backend = find(components, "backend")?;
    let node_bin = node.path.join(if cfg!(windows) { "node.exe" } else { "node" });
    let script = backend.path.join("dist").join("index.js");
    Some((node_bin, script))
}
