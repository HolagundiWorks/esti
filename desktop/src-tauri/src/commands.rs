//! Control-plane state + Tauri commands the dedicated Manager status window
//! calls: report provisioning/health status, accept a licence key on first run.
//! (Process-restart commands land with the boot-loop rewire, which owns the
//! restartable launch context.)

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Snapshot of what the Manager is doing / the health of what it supervises.
#[derive(Debug, Clone, Serialize)]
pub struct ManagerStatus {
    /// "licence" (awaiting key) | "provisioning" | "starting" | "ready" | "error"
    pub phase: String,
    pub message: String,
    pub node: bool,
    pub db: bool,
    pub ai: bool,
    /// 0..=100 download/provision progress.
    pub progress: u8,
}

impl Default for ManagerStatus {
    fn default() -> Self {
        Self {
            phase: "starting".into(),
            message: "Starting…".into(),
            node: false,
            db: false,
            ai: false,
            progress: 0,
        }
    }
}

#[derive(Default)]
pub struct ManagerState {
    pub status: Mutex<ManagerStatus>,
}

impl ManagerState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Update the status and push it to the Manager window (if open).
    pub fn set(&self, app: &AppHandle, next: ManagerStatus) {
        *self.status.lock().unwrap() = next.clone();
        let _ = app.emit("manager://status", next);
    }
}

/// Current status for the window to render.
#[tauri::command]
pub fn manager_status(state: tauri::State<'_, ManagerState>) -> ManagerStatus {
    state.status.lock().unwrap().clone()
}

/// First-run licence entry: persist the key so the next launch provisions.
/// (The window then prompts the user to relaunch; live re-provisioning without
/// a restart lands with the boot-loop rewire.)
#[tauri::command]
pub fn submit_license(key: String, app: AppHandle) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Enter your licence key.".into());
    }
    let paths = crate::paths::resolve(&app).map_err(|e| e.to_string())?;
    crate::provision::config::store_license(&paths.secrets, key)
}

/// Persist the workspace session token in the app secrets dir (not web localStorage).
#[tauri::command]
pub fn store_session_token(token: String, app: AppHandle) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("Empty session token.".into());
    }
    let paths = crate::paths::resolve(&app).map_err(|e| e.to_string())?;
    crate::provision::config::store_session(&paths.secrets, token)
}

#[tauri::command]
pub fn load_session_token(app: AppHandle) -> Result<Option<String>, String> {
    let paths = crate::paths::resolve(&app).map_err(|e| e.to_string())?;
    Ok(crate::provision::config::load_session(&paths.secrets))
}

#[tauri::command]
pub fn clear_session_token(app: AppHandle) -> Result<(), String> {
    let paths = crate::paths::resolve(&app).map_err(|e| e.to_string())?;
    crate::provision::config::clear_session(&paths.secrets)
}

/// Open the dedicated Manager status window (small, separate from the app SPA).
/// Loads `manager.html` bundled under the app's resources.
pub fn open_manager_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window("manager").is_some() {
        return Ok(());
    }
    WebviewWindowBuilder::new(app, "manager", WebviewUrl::App("manager.html".into()))
        .title("AORMS Manager")
        .inner_size(520.0, 420.0)
        .resizable(false)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
