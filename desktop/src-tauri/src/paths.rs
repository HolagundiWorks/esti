use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Per-OS application data layout (Windows: %APPDATA%\in.aorms.esti\).
pub struct AppPaths {
    pub root: PathBuf,
    pub pgdata: PathBuf,
    /// Where the embedded PostgreSQL binaries are extracted on first boot.
    /// Deliberately NOT pre-created: `postgresql_embedded` treats an existing
    /// installation dir as "already installed" and skips extraction, so the
    /// directory must be absent until the archive is unpacked into it.
    pub pgbin: PathBuf,
    pub files: PathBuf,
    pub logs: PathBuf,
    pub secrets: PathBuf,
    /// Downloaded, verified component payloads (backend, node, ai…).
    pub payloads: PathBuf,
}

pub fn resolve(app: &AppHandle) -> std::io::Result<AppPaths> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    let p = AppPaths {
        pgdata: root.join("pgdata"),
        pgbin: root.join("pgsql"),
        files: root.join("files"),
        logs: root.join("logs"),
        secrets: root.join("secrets"),
        payloads: root.join("payloads"),
        root,
    };
    // NB: `pgbin` is intentionally excluded — see AppPaths::pgbin. It is created
    // by the archive extraction, and pre-creating it would suppress that.
    for d in [&p.root, &p.files, &p.logs, &p.secrets, &p.payloads] {
        fs::create_dir_all(d)?;
    }
    Ok(p)
}

/// Load a persisted secret/value, generating + storing it on first run.
pub fn load_or_create(path: &Path, generate: impl Fn() -> String) -> std::io::Result<String> {
    if let Ok(existing) = fs::read_to_string(path) {
        let trimmed = existing.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    let value = generate();
    fs::write(path, &value)?;
    Ok(value)
}

/// A random lowercase-hex string of `bytes` bytes (2 hex chars each).
pub fn rand_hex(bytes: usize) -> String {
    use rand::RngCore;
    let mut buf = vec![0u8; bytes];
    rand::thread_rng().fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{b:02x}")).collect()
}
