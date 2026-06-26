mod paths;
mod supervisor;

use std::collections::HashMap;
use std::sync::Mutex;
use postgresql_embedded::PostgreSQL;
use tauri::{AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandChild;

/// App-owned child processes, taken down on exit.
struct Supervised {
    pg: Mutex<Option<PostgreSQL>>,
    backend: Mutex<Option<CommandChild>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Supervised {
            pg: Mutex::new(None),
            backend: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            // Boot the local stack off the UI thread; the window is created once
            // the backend reports ready (so the user never sees a dead page).
            tauri::async_runtime::spawn(async move {
                if let Err(e) = boot(handle.clone()).await {
                    log::error!("ESTI boot failed: {e}");
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building ESTI desktop")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                shutdown(app);
            }
        });
}

async fn boot(app: AppHandle) -> Result<(), String> {
    let p = paths::resolve(&app).map_err(|e| e.to_string())?;

    // Per-install secrets (generated once, persisted).
    let session_secret =
        paths::load_or_create(&p.secrets.join("session.key"), || paths::rand_hex(32))
            .map_err(|e| e.to_string())?;
    let db_password =
        paths::load_or_create(&p.secrets.join("db.pass"), || paths::rand_hex(16))
            .map_err(|e| e.to_string())?;
    // Stable per-install identity for licence activation/refresh + sync auth.
    let install_id =
        paths::load_or_create(&p.secrets.join("install.id"), || paths::rand_hex(16))
            .map_err(|e| e.to_string())?;

    // Local PostgreSQL (init on first run; starts on a port it picks itself).
    let pg = supervisor::postgres::start(p.pgdata.clone(), db_password).await?;
    let database_url = pg.url.clone();

    // Free port for the backend sidecar; the SPA is told this base.
    let backend_port = portpicker::pick_unused_port().ok_or("no free port for backend")?;
    let api_base = format!("http://127.0.0.1:{backend_port}");

    let mut env = HashMap::new();
    env.insert("NODE_ENV".into(), "production".into());
    env.insert("DESKTOP".into(), "1".into());
    env.insert("BACKEND_PORT".into(), backend_port.to_string());
    env.insert("DATABASE_URL".into(), database_url);
    env.insert("SESSION_SECRET".into(), session_secret);
    env.insert("STORAGE_DRIVER".into(), "fs".into());
    env.insert("STORAGE_DIR".into(), p.files.to_string_lossy().to_string());
    env.insert("FILES_PUBLIC_BASE".into(), format!("{api_base}/files"));
    env.insert("WORKER_MODE".into(), "inproc".into());
    env.insert("COOKIE_SECURE".into(), "false".into());
    // Licensing (Phase B): the install identity + the central hub it activates
    // against. ESTI_HUB_URL is empty by default (offline) and can be supplied at
    // launch; the firm activates a key from Company → Licence.
    env.insert("INSTALL_ID".into(), install_id);
    env.insert(
        "ESTI_HUB_URL".into(),
        std::env::var("ESTI_HUB_URL").unwrap_or_default(),
    );
    env.insert(
        "ALLOWED_ORIGINS".into(),
        format!("{api_base},tauri://localhost,http://tauri.localhost"),
    );

    // Backend entry: the bundled dist, or an override for `tauri dev`.
    let script = std::env::var("ESTI_BACKEND_SCRIPT").unwrap_or_else(|_| {
        app.path()
            .resource_dir()
            .map(|r| {
                r.join("resources")
                    .join("backend")
                    .join("dist")
                    .join("index.js")
                    .to_string_lossy()
                    .to_string()
            })
            .unwrap_or_else(|_| "resources/backend/dist/index.js".to_string())
    });

    let child = supervisor::backend::spawn(&app, script, env).await?;

    // Stash handles for clean shutdown.
    {
        let state = app.state::<Supervised>();
        *state.pg.lock().unwrap() = Some(pg.inner);
        *state.backend.lock().unwrap() = Some(child);
    }

    if !supervisor::backend::wait_ready(&api_base).await {
        return Err("backend did not become ready in time".into());
    }

    // Create the window now, injecting the runtime API base before the SPA loads
    // (initialization_script runs before the page's own scripts on every load).
    let init = format!("window.__ESTI__ = {{ apiBase: '{api_base}' }};");
    WebviewWindowBuilder::new(&app, "main", WebviewUrl::App("index.html".into()))
        .title("ESTI AORMS")
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 680.0)
        .initialization_script(&init)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn shutdown(app: &AppHandle) {
    let state = app.state::<Supervised>();
    // Take the values out of the mutexes into locals so the guards drop before the
    // (potentially blocking) shutdown work below — keeps no borrow of `state` alive.
    let child = state.backend.lock().unwrap().take();
    if let Some(child) = child {
        let _ = child.kill();
    }
    let pg = state.pg.lock().unwrap().take();
    if let Some(pg) = pg {
        tauri::async_runtime::block_on(async move {
            supervisor::postgres::stop(&pg).await;
        });
    }
}
