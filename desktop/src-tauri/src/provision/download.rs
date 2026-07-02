//! Download a manifest component to the payload store and verify its SHA-256
//! before it is ever unpacked or executed. A hash mismatch deletes the file and
//! fails — a downloaded artifact is only trusted once both the manifest
//! signature (see `manifest.rs`) and this per-file hash check pass.

use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use super::manifest::ManifestComponent;

/// Download `component` into `dir` (named `<id>-<version>`), streaming to disk,
/// and verify its SHA-256 matches the manifest. Returns the file path on success.
/// If a file with the correct hash already exists, the download is skipped.
pub async fn download_and_verify(
    component: &ManifestComponent,
    dir: &Path,
) -> Result<PathBuf, String> {
    tokio::fs::create_dir_all(dir)
        .await
        .map_err(|e| format!("create {dir:?}: {e}"))?;
    let dest = dir.join(format!("{}-{}", component.id, component.version));

    // Already present + correct? Skip re-downloading (offline-friendly caching).
    if let Ok(existing) = tokio::fs::read(&dest).await {
        if sha256_hex(&existing) == component.sha256.to_lowercase() {
            return Ok(dest);
        }
    }

    let resp = reqwest::Client::new()
        .get(&component.url)
        .send()
        .await
        .map_err(|e| format!("download {}: {e}", component.id))?;
    if !resp.status().is_success() {
        return Err(format!("download {} status {}", component.id, resp.status()));
    }

    // Stream to a temp file while hashing, then verify before promoting.
    let tmp = dir.join(format!(".{}-{}.part", component.id, component.version));
    let mut file = tokio::fs::File::create(&tmp)
        .await
        .map_err(|e| format!("create temp {tmp:?}: {e}"))?;
    let mut hasher = Sha256::new();
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("download {} stream: {e}", component.id))?;
        hasher.update(&chunk);
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("write {tmp:?}: {e}"))?;
    }
    file.flush().await.map_err(|e| format!("flush {tmp:?}: {e}"))?;
    drop(file);

    let got = hex::encode(hasher.finalize());
    let want = component.sha256.to_lowercase();
    if got != want {
        let _ = tokio::fs::remove_file(&tmp).await;
        return Err(format!(
            "checksum mismatch for {}: expected {want}, got {got}",
            component.id
        ));
    }

    tokio::fs::rename(&tmp, &dest)
        .await
        .map_err(|e| format!("promote {tmp:?} -> {dest:?}: {e}"))?;
    Ok(dest)
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut h = Sha256::new();
    h.update(bytes);
    hex::encode(h.finalize())
}
