//! Unpack a verified component archive into the payload store.
//!
//! Packaging contract (what the Phase-6 build pipeline produces): every
//! component whose artifact ends in `.tar.gz` / `.tgz` is a gzip'd tar that
//! unpacks to a known per-component layout under
//! `<store>/<appVersion>/<component-id>/`, e.g.
//!   - `backend/`  → `dist/`, `node_modules/`, `drizzle/`
//!   - `node/`     → the Node runtime (`node` / `node.exe`)
//!   - `postgres/` → embedded PostgreSQL binaries
//!   - `ollama/`   → the Ollama runtime (PRO)
//! A component whose artifact isn't an archive (e.g. a bare `model` blob) is
//! used in place. Unpacking runs only AFTER the artifact's SHA-256 is verified.

use std::path::{Path, PathBuf};

use flate2::read::GzDecoder;
use tar::Archive;

/// Is this artifact a gzip'd tarball we should extract?
pub fn is_archive(name: &str) -> bool {
    let n = name.to_lowercase();
    n.ends_with(".tar.gz") || n.ends_with(".tgz")
}

/// Extract a `.tar.gz` into `dest` (created if needed). The `tar` crate refuses
/// entries that escape the destination (absolute paths / `..`), so a malicious
/// archive can't write outside the payload store. Returns `dest`.
pub fn unpack_tar_gz(archive: &Path, dest: &Path) -> Result<PathBuf, String> {
    std::fs::create_dir_all(dest).map_err(|e| format!("create {dest:?}: {e}"))?;
    let file = std::fs::File::open(archive).map_err(|e| format!("open {archive:?}: {e}"))?;
    let mut ar = Archive::new(GzDecoder::new(file));
    ar.set_overwrite(true);
    ar.unpack(dest).map_err(|e| format!("unpack {archive:?}: {e}"))?;
    Ok(dest.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    fn make_targz(dir: &Path) -> PathBuf {
        // Build a tiny .tar.gz containing dist/index.js with known content.
        let path = dir.join("backend.tar.gz");
        let gz = GzEncoder::new(std::fs::File::create(&path).unwrap(), Compression::default());
        let mut builder = tar::Builder::new(gz);
        let body = b"console.log('hi');";
        let mut header = tar::Header::new_gnu();
        header.set_size(body.len() as u64);
        header.set_mode(0o644);
        header.set_cksum();
        builder.append_data(&mut header, "dist/index.js", &body[..]).unwrap();
        builder.into_inner().unwrap().finish().unwrap();
        path
    }

    #[test]
    fn detects_archive_extensions() {
        assert!(is_archive("backend-1.0.tar.gz"));
        assert!(is_archive("x.TGZ"));
        assert!(!is_archive("model.gguf"));
        assert!(!is_archive("node.exe"));
    }

    #[test]
    fn unpacks_targz_to_dest() {
        let tmp = std::env::temp_dir().join(format!("esti-unpack-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&tmp);
        std::fs::create_dir_all(&tmp).unwrap();
        let archive = make_targz(&tmp);
        let dest = tmp.join("out");
        unpack_tar_gz(&archive, &dest).unwrap();
        let extracted = std::fs::read_to_string(dest.join("dist/index.js")).unwrap();
        assert!(extracted.contains("hi"));
        let _ = std::fs::remove_dir_all(&tmp);
    }
}
