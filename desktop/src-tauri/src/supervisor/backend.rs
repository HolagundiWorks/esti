use std::collections::HashMap;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::time::Duration;

/// Launch the backend as a plain child process: a provisioned (or dev) Node
/// runtime running the backend's `dist/index.js`, with the desktop env. Unlike
/// the old bundled sidecar, `node` and the backend come from the downloaded
/// payload, so there's nothing to allow-list in the shell scope — we spawn
/// directly. stdout/stderr are redirected to a log file (the only way to see a
/// boot crash on a user's machine).
pub fn spawn_process(
    node: &Path,
    script: &Path,
    env: HashMap<String, String>,
    log_path: &Path,
) -> Result<Child, String> {
    let log = std::fs::File::create(log_path).map_err(|e| format!("create log {log_path:?}: {e}"))?;
    let errlog = log.try_clone().map_err(|e| format!("clone log handle: {e}"))?;
    Command::new(node)
        .arg(script)
        .envs(env)
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(errlog))
        .spawn()
        .map_err(|e| format!("spawn backend ({node:?} {script:?}): {e}"))
}

/// Poll `GET {base}/readyz` until it returns 200 (or times out at ~4 min).
///
/// First boot runs ALL database migrations + the Community seed against a
/// freshly-initialized embedded Postgres *before* the server calls listen(), so
/// `/readyz` (and the port itself) can be unreachable for a while on a cold
/// machine — 60s was too tight and produced spurious "not ready" failures. A
/// real crash is surfaced by the caller via the backend log tail, so a generous
/// ceiling here costs nothing when the backend is genuinely dead.
pub async fn wait_ready(base: &str) -> bool {
    let client = reqwest::Client::new();
    let url = format!("{base}/readyz");
    for _ in 0..480 {
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                return true;
            }
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}
