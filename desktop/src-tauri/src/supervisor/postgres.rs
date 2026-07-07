use std::path::PathBuf;
use postgresql_embedded::{PostgreSQL, Settings};

/// A running, app-owned PostgreSQL instance + the connection URL the backend uses.
pub struct Pg {
    pub inner: PostgreSQL,
    pub url: String,
}

/// Init (first run) + start a local PostgreSQL into `pgdata`, ensuring the `esti`
/// database exists. The data dir persists across runs; `setup()` is a no-op once
/// initialised.
///
/// The PG binaries are EMBEDDED in the executable (the `bundled` cargo feature),
/// so first boot extracts them into `install_dir` — no network. `install_dir`
/// must not exist yet the first time (the crate skips extraction if it does; see
/// `AppPaths::pgbin`).
pub async fn start(pgdata: PathBuf, install_dir: PathBuf, password: String) -> Result<Pg, String> {
    let mut settings = Settings::default();
    settings.data_dir = pgdata;
    // Pin the install location to an app-owned path (default would be
    // ~/.theseus/postgresql). `Settings::default().version` already equals the
    // bundled archive's exact version, so `setup()` uses the embedded bytes.
    settings.installation_dir = install_dir;
    // NB: postgresql_embedded ALWAYS initdb's the superuser as "postgres"
    // (BOOTSTRAP_SUPERUSER) and ignores settings.username — so the connection URL
    // below must use "postgres", not a custom name, or the backend gets
    // `role "esti" does not exist`. The password IS applied to postgres (--pwfile).
    settings.password = password.clone();
    settings.temporary = false; // persist across launches

    let mut pg = PostgreSQL::new(settings);
    pg.setup().await.map_err(|e| format!("postgres setup: {e}"))?;
    pg.start().await.map_err(|e| format!("postgres start: {e}"))?;

    if !pg
        .database_exists("esti")
        .await
        .map_err(|e| format!("postgres database_exists: {e}"))?
    {
        pg.create_database("esti")
            .await
            .map_err(|e| format!("postgres create_database: {e}"))?;
    }

    let port = pg.settings().port;
    let url = format!("postgres://postgres:{password}@127.0.0.1:{port}/esti");
    Ok(Pg { inner: pg, url })
}

pub async fn stop(pg: &PostgreSQL) {
    if let Err(e) = pg.stop().await {
        log::warn!("postgres stop failed: {e}");
    }
}
