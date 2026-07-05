//! AORMS Estimate — a thin Tauri shell over the offline estimating SPA. No
//! backend, no database: it just hosts the webview. All work is local; the app
//! exports a sealed `.aormsest` file the user imports into AORMS.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running AORMS Estimate");
}
