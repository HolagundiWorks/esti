mod commands;
mod paths;
mod provision;
mod supervisor;

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Child;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use postgresql_embedded::PostgreSQL;
use tauri::{AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

use commands::{ManagerState, ManagerStatus};
use supervisor::health::{RestartDecision, RestartPolicy};

/// App-owned child processes, taken down on exit.
struct Supervised {
    pg: Mutex<Option<PostgreSQL>>,
    backend: Mutex<Option<Child>>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Supervised {
            pg: Mutex::new(None),
            backend: Mutex::new(None),
        })
        .manage(ManagerState::new())
        .invoke_handler(tauri::generate_handler![
            commands::manager_status,
            commands::submit_license,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            // Show the Manager status window immediately, then boot off the UI
            // thread; the app window opens once the backend reports ready.
            let _ = commands::open_manager_window(&handle);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = boot(handle.clone()).await {
                    log::error!("ESTI boot failed: {e}");
                    set_status(
                        &handle,
                        ManagerStatus {
                            phase: "error".into(),
                            message: format!("Startup failed: {e}"),
                            ..Default::default()
                        },
                    );
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

fn set_status(app: &AppHandle, status: ManagerStatus) {
    app.state::<ManagerState>().set(app, status);
}

/// The payload bundled inside the installer: the vendored Node sidecar
/// installed next to the app binary plus `resources/backend`. This is the
/// licence-free LITE path — a fresh install runs offline out of the box.
/// Returns None only for a thin Manager build shipped without a payload.
fn bundled_backend(app: &AppHandle) -> Option<(PathBuf, PathBuf)> {
    let exe = std::env::current_exe().ok()?;
    let node = exe
        .parent()?
        .join(if cfg!(windows) { "esti-backend.exe" } else { "esti-backend" });
    let script = app.path().resource_dir().ok().map(|r| {
        let p = r
            .join("resources")
            .join("backend")
            .join("dist")
            .join("index.js")
            .to_string_lossy()
            .to_string();
        // Strip the Windows \\?\ extended-length prefix that resource_dir()
        // returns — Node's main-module resolver chokes on it.
        PathBuf::from(p.strip_prefix(r"\\?\").map(str::to_string).unwrap_or(p))
    })?;
    (node.exists() && script.exists()).then_some((node, script))
}

/// Resolve where the backend runs from: a dev override, the provisioned
/// payload downloaded for this licence, or the payload bundled in the
/// installer (unmanaged/offline). Returns None only when there is neither a
/// licence nor a bundled payload (the status window collects a key, then the
/// user relaunches).
async fn resolve_backend(app: &AppHandle, p: &paths::AppPaths) -> Result<Option<(PathBuf, PathBuf)>, String> {
    // Dev override: a local backend entry run by the system Node.
    if let Ok(script) = std::env::var("ESTI_BACKEND_SCRIPT") {
        return Ok(Some((PathBuf::from("node"), PathBuf::from(script))));
    }

    let Some(cfg) = provision::config::resolve(&p.secrets) else {
        // Unmanaged install (no licence): run what the installer shipped.
        if let Some(bundled) = bundled_backend(app) {
            return Ok(Some(bundled));
        }
        set_status(
            app,
            ManagerStatus {
                phase: "licence".into(),
                message: "Enter your AORMS licence key to set up this install.".into(),
                ..Default::default()
            },
        );
        return Ok(None);
    };

    match provision_backend(app, p, &cfg).await {
        Ok(pair) => Ok(Some(pair)),
        // A managed install that can't reach the hub (offline, hub down, no
        // manifest published yet) still starts on the bundled payload rather
        // than dead-ending; the next launch retries provisioning.
        Err(e) => match bundled_backend(app) {
            Some(bundled) => {
                log::warn!("provisioning failed ({e}); starting the bundled payload instead");
                Ok(Some(bundled))
            }
            None => Err(e),
        },
    }
}

/// Managed path: fetch the signed manifest for this licence and download +
/// verify every component, reporting progress to the status window.
async fn provision_backend(
    app: &AppHandle,
    p: &paths::AppPaths,
    cfg: &provision::config::ProvisionConfig,
) -> Result<(PathBuf, PathBuf), String> {
    set_status(
        app,
        ManagerStatus {
            phase: "provisioning".into(),
            message: "Checking for the latest AORMS components…".into(),
            ..Default::default()
        },
    );

    let manifest =
        provision::manifest::fetch_manifest(&cfg.hub_base, &cfg.product_key, &cfg.license_key).await?;
    let total = manifest.components.len().max(1);
    let version_dir = p.payloads.join(&manifest.app_version);
    let downloads = version_dir.join("_dl");

    let mut provisioned = Vec::with_capacity(manifest.components.len());
    for (i, c) in manifest.components.iter().enumerate() {
        set_status(
            app,
            ManagerStatus {
                phase: "provisioning".into(),
                message: format!("Downloading {} ({}/{})", c.id, i + 1, total),
                progress: ((i * 100) / total) as u8,
                ..Default::default()
            },
        );
        let artifact = provision::download::download_and_verify(c, &downloads).await?;
        let path = if provision::unpack::is_archive(&c.url) {
            let dest = version_dir.join(&c.id);
            provision::unpack::unpack_tar_gz(&artifact, &dest)?;
            dest
        } else {
            artifact
        };
        provisioned.push(provision::ProvisionedComponent {
            id: c.id.clone(),
            kind: c.kind.clone(),
            path,
        });
    }

    provision::backend_launch(&provisioned)
        .ok_or_else(|| "payload is missing the node or backend component".to_string())
}

async fn boot(app: AppHandle) -> Result<(), String> {
    let p = paths::resolve(&app).map_err(|e| e.to_string())?;

    // Per-install secrets (generated once, persisted).
    let session_secret =
        paths::load_or_create(&p.secrets.join("session.key"), || paths::rand_hex(32)).map_err(|e| e.to_string())?;
    let db_password =
        paths::load_or_create(&p.secrets.join("db.pass"), || paths::rand_hex(16)).map_err(|e| e.to_string())?;
    let install_id =
        paths::load_or_create(&p.secrets.join("install.id"), || paths::rand_hex(16)).map_err(|e| e.to_string())?;

    // Where does the backend run from? (None → awaiting a licence; stop here.)
    let Some((node_bin, script_path)) = resolve_backend(&app, &p).await? else {
        return Ok(());
    };

    set_status(
        &app,
        ManagerStatus { phase: "starting".into(), message: "Starting AORMS…".into(), progress: 100, ..Default::default() },
    );

    // Local PostgreSQL (init on first run; starts on a port it picks itself).
    // Binaries are embedded in the installer and extracted into `pgbin` — no
    // network on first boot.
    let pg = supervisor::postgres::start(p.pgdata.clone(), p.pgbin.clone(), db_password).await?;
    let database_url = pg.url.clone();

    let backend_port = portpicker::pick_unused_port().ok_or("no free port for backend")?;
    let api_base = format!("http://127.0.0.1:{backend_port}");

    let env = backend_env(&p, &api_base, backend_port, database_url, session_secret, install_id);

    let child = supervisor::backend::spawn_process(&node_bin, &script_path, env.clone(), &p.logs.join("backend.log"))?;
    {
        let state = app.state::<Supervised>();
        *state.pg.lock().unwrap() = Some(pg.inner);
        *state.backend.lock().unwrap() = Some(child);
    }

    if !supervisor::backend::wait_ready(&api_base).await {
        return Err("backend did not become ready in time".into());
    }
    set_status(
        &app,
        ManagerStatus { phase: "ready".into(), message: "AORMS is running.".into(), node: true, db: true, progress: 100, ..Default::default() },
    );

    // Open the app window and drop the status window (it re-opens only if the
    // supervisor later reports trouble).
    let init = format!("window.__ESTI__ = {{ apiBase: '{api_base}' }};");
    WebviewWindowBuilder::new(&app, "main", WebviewUrl::App("index.html".into()))
        .title("AORMS")
        .inner_size(1440.0, 900.0)
        .min_inner_size(1024.0, 680.0)
        .initialization_script(&init)
        .build()
        .map_err(|e| e.to_string())?;
    if let Some(w) = app.get_webview_window("manager") {
        let _ = w.close();
    }

    // Supervise: restart the backend on health failure (with backoff / give-up).
    let watch_app = app.clone();
    tauri::async_runtime::spawn(async move {
        watch_backend(watch_app, api_base, node_bin, script_path, env, p.logs.join("backend.log")).await;
    });

    Ok(())
}

/// Build the backend environment. Seeds from the parent env (so the child
/// inherits SystemRoot/PATH/TEMP on Windows), then applies app overrides.
fn backend_env(
    p: &paths::AppPaths,
    api_base: &str,
    backend_port: u16,
    database_url: String,
    session_secret: String,
    install_id: String,
) -> HashMap<String, String> {
    let mut env: HashMap<String, String> = std::env::vars().collect();
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
    // Edition falls back to the baked value; a licence (below) overrides the plan.
    let baked_edition = option_env!("AORMS_EDITION").unwrap_or("LITE");
    // COMMUNITY is the free, offline, LAN-only appliance: it runs on the LITE
    // plan but flips the backend's ESTI_EDITION so it strips licence/online/AI/
    // portal surfaces and seeds the first-run admin. FIRM_PLAN stays LITE.
    let community = baked_edition.eq_ignore_ascii_case("COMMUNITY");
    let plan = if community { "LITE".to_string() } else { baked_edition.to_string() };
    env.insert(
        "FIRM_PLAN".into(),
        std::env::var("FIRM_PLAN").unwrap_or(plan),
    );
    if community {
        env.insert(
            "ESTI_EDITION".into(),
            std::env::var("ESTI_EDITION").unwrap_or_else(|_| "COMMUNITY".into()),
        );
    }
    env.insert("INSTALL_ID".into(), install_id);
    env.insert(
        "ESTI_HUB_URL".into(),
        std::env::var("ESTI_HUB_URL").unwrap_or_default(),
    );
    // Central licensing cloud (License Panel, /platform/v1) — wired by default
    // so Company → Licence key activation reaches aorms.in out of the box.
    // Unlike ESTI_HUB_URL this does NOT mark the install managed: with no
    // activated key the install stays unmanaged on the baked edition and is
    // never write-blocked. Overridable at launch for a self-hosted hub.
    env.insert(
        "ESTI_LICENSE_API_URL".into(),
        std::env::var("ESTI_LICENSE_API_URL")
            .unwrap_or_else(|_| "https://aorms.in/platform".into()),
    );
    // The /v1 API authenticates the PRODUCT via a per-product key. Public
    // installers bake it at build time (AORMS_PRODUCT_API_KEY — a CI secret,
    // like AORMS_EDITION); a runtime env still overrides. Empty → activation
    // returns 401 until a key is supplied, everything else works offline.
    env.insert(
        "ESTI_PRODUCT_API_KEY".into(),
        std::env::var("ESTI_PRODUCT_API_KEY")
            .unwrap_or_else(|_| option_env!("AORMS_PRODUCT_API_KEY").unwrap_or("").to_string()),
    );
    // Managed install: a provisioned config (Manager model) is authoritative —
    // it hands the backend its hub + credentials so it activates the licence
    // (plan/seats come from the signed token, overriding FIRM_PLAN).
    if let Some(cfg) = provision::config::resolve(&p.secrets) {
        env.insert("ESTI_LICENSE_API_URL".into(), cfg.hub_base);
        env.insert("ESTI_PRODUCT_API_KEY".into(), cfg.product_key);
        env.insert("ESTI_LICENSE_KEY".into(), cfg.license_key);
    }
    env.insert(
        "ALLOWED_ORIGINS".into(),
        format!("{api_base},tauri://localhost,http://tauri.localhost"),
    );
    env
}

/// Watch the backend; on a sustained health failure, restart it under the
/// crash-loop policy. Gives up (and surfaces the error to the status window)
/// after too many restarts in the window.
async fn watch_backend(
    app: AppHandle,
    api_base: String,
    node: PathBuf,
    script: PathBuf,
    env: HashMap<String, String>,
    log: PathBuf,
) {
    let mut policy = RestartPolicy::default_backend();
    let start = Instant::now();
    loop {
        tokio::time::sleep(Duration::from_secs(10)).await;
        if supervisor::health::probe(&api_base).await {
            continue;
        }
        let now_ms = start.elapsed().as_millis() as u64;
        match policy.record_and_decide(now_ms) {
            RestartDecision::GiveUp => {
                set_status(
                    &app,
                    ManagerStatus {
                        phase: "error".into(),
                        message: "The application service keeps failing. Please restart AORMS.".into(),
                        ..Default::default()
                    },
                );
                let _ = commands::open_manager_window(&app);
                break;
            }
            RestartDecision::Restart { after_ms } => {
                set_status(
                    &app,
                    ManagerStatus { phase: "starting".into(), message: "Restarting the application service…".into(), db: true, ..Default::default() },
                );
                let _ = commands::open_manager_window(&app);
                if let Some(mut old) = app.state::<Supervised>().backend.lock().unwrap().take() {
                    let _ = old.kill();
                }
                tokio::time::sleep(Duration::from_millis(after_ms)).await;
                match supervisor::backend::spawn_process(&node, &script, env.clone(), &log) {
                    Ok(child) => {
                        *app.state::<Supervised>().backend.lock().unwrap() = Some(child);
                        if supervisor::backend::wait_ready(&api_base).await {
                            set_status(
                                &app,
                                ManagerStatus { phase: "ready".into(), message: "AORMS is running.".into(), node: true, db: true, progress: 100, ..Default::default() },
                            );
                            if let Some(w) = app.get_webview_window("manager") {
                                let _ = w.close();
                            }
                        }
                    }
                    Err(e) => log::error!("backend respawn failed: {e}"),
                }
            }
        }
    }
}

fn shutdown(app: &AppHandle) {
    let state = app.state::<Supervised>();
    let child = state.backend.lock().unwrap().take();
    if let Some(mut child) = child {
        let _ = child.kill();
    }
    let pg = state.pg.lock().unwrap().take();
    if let Some(pg) = pg {
        tauri::async_runtime::block_on(async move {
            supervisor::postgres::stop(&pg).await;
        });
    }
}
