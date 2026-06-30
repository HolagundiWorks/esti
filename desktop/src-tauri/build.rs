fn main() {
    // Re-bake the compiled-in edition (option_env!("AORMS_EDITION")) whenever the
    // edition changes, so Lite/Core/Enterprise builds sharing one target dir don't
    // reuse each other's baked FIRM_PLAN.
    println!("cargo:rerun-if-env-changed=AORMS_EDITION");
    tauri_build::build()
}
