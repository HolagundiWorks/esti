use std::collections::HashMap;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Spawn the bundled Node backend sidecar (`esti-backend`, a vendored node.exe)
/// running the bundled `dist/index.js`, with the desktop env. Its stdout/stderr
/// are pumped into the shell log. Returns the child handle for shutdown.
pub async fn spawn(
    app: &AppHandle,
    script: String,
    env: HashMap<String, String>,
) -> Result<CommandChild, String> {
    let (mut rx, child) = app
        .shell()
        .sidecar("esti-backend")
        .map_err(|e| format!("sidecar resolve: {e}"))?
        .args([script])
        .envs(env)
        .spawn()
        .map_err(|e| format!("sidecar spawn: {e}"))?;

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    log::info!("[backend] {}", String::from_utf8_lossy(&line).trim_end())
                }
                CommandEvent::Stderr(line) => {
                    log::warn!("[backend] {}", String::from_utf8_lossy(&line).trim_end())
                }
                CommandEvent::Terminated(payload) => {
                    log::warn!("[backend] terminated: {:?}", payload.code)
                }
                _ => {}
            }
        }
    });

    Ok(child)
}

/// Poll `GET {base}/readyz` until it returns 200 (or times out at ~60s).
pub async fn wait_ready(base: &str) -> bool {
    let client = reqwest::Client::new();
    let url = format!("{base}/readyz");
    for _ in 0..120 {
        if let Ok(resp) = client.get(&url).send().await {
            if resp.status().is_success() {
                return true;
            }
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
    false
}
