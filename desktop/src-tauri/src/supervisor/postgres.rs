use std::path::PathBuf;
use postgresql_embedded::{PostgreSQL, Settings};

/// A running, app-owned PostgreSQL instance + the connection URL the backend uses.
pub struct Pg {
    pub inner: PostgreSQL,
    pub url: String,
}

/// Init (first run) + start a local PostgreSQL into `pgdata`, ensuring the `esti`
/// database exists. The data dir persists across runs; `setup()` is a no-op once
/// initialised. Binaries are downloaded on first `setup()` (vendor them for an
/// offline installer in P3).
pub async fn start(pgdata: PathBuf, password: String) -> Result<Pg, String> {
    let mut settings = Settings::default();
    settings.data_dir = pgdata;
    settings.username = "esti".to_string();
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
    let url = format!("postgres://esti:{password}@127.0.0.1:{port}/esti");
    Ok(Pg { inner: pg, url })
}

pub async fn stop(pg: &PostgreSQL) {
    if let Err(e) = pg.stop().await {
        log::warn!("postgres stop failed: {e}");
    }
}
