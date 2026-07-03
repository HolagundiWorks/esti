//! Provisioning configuration: whether this install is a *managed* node that
//! pulls its payload from the hub, and with what credentials.
//!
//! Resolved from (in order) the environment or the persisted secrets dir:
//!   - licence key   — `ESTI_LICENSE_KEY`  / `<secrets>/license.key`
//!   - hub base URL  — `ESTI_LICENSE_API_URL` (default `https://aorms.in/platform`)
//!   - product key   — `ESTI_PRODUCT_API_KEY` / `<secrets>/product.key`
//!
//! No licence + product key → `None` → the Manager runs the bundled/offline
//! path (unchanged legacy behaviour). The status window writes a submitted
//! licence via `store_license`, so a fresh install becomes managed after the
//! user enters their key.

use std::collections::HashMap;
use std::path::Path;

pub const DEFAULT_HUB: &str = "https://aorms.in/platform";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProvisionConfig {
    pub license_key: String,
    pub hub_base: String,
    pub product_key: String,
}

/// Pure resolver (env map + secrets dir) so the decision logic is testable.
pub fn resolve_from(env: &HashMap<String, String>, secrets: &Path) -> Option<ProvisionConfig> {
    let pick = |k: &str, file: &str| -> Option<String> {
        env.get(k)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .or_else(|| {
                std::fs::read_to_string(secrets.join(file))
                    .ok()
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
            })
    };
    let license_key = pick("ESTI_LICENSE_KEY", "license.key")?;
    let product_key = pick("ESTI_PRODUCT_API_KEY", "product.key")?;
    let hub_base = pick("ESTI_LICENSE_API_URL", "hub.url").unwrap_or_else(|| DEFAULT_HUB.to_string());
    Some(ProvisionConfig { license_key, hub_base, product_key })
}

/// Resolve from the real process environment.
pub fn resolve(secrets: &Path) -> Option<ProvisionConfig> {
    let env: HashMap<String, String> = std::env::vars().collect();
    resolve_from(&env, secrets)
}

/// Persist a licence key entered in the status window (so the next launch is managed).
pub fn store_license(secrets: &Path, key: &str) -> Result<(), String> {
    std::fs::create_dir_all(secrets).map_err(|e| format!("create secrets dir: {e}"))?;
    std::fs::write(secrets.join("license.key"), key.trim())
        .map_err(|e| format!("write license.key: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp() -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("esti-cfg-{}-{}", std::process::id(), rand::random::<u32>()));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn none_without_credentials() {
        let d = tmp();
        assert!(resolve_from(&HashMap::new(), &d).is_none());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn resolves_from_env_with_default_hub() {
        let mut env = HashMap::new();
        env.insert("ESTI_LICENSE_KEY".into(), "HLP-AAAA-BBBB-CCCC".into());
        env.insert("ESTI_PRODUCT_API_KEY".into(), "hlp_sk_x".into());
        let cfg = resolve_from(&env, Path::new("/nonexistent")).unwrap();
        assert_eq!(cfg.license_key, "HLP-AAAA-BBBB-CCCC");
        assert_eq!(cfg.hub_base, DEFAULT_HUB);
    }

    #[test]
    fn env_overrides_and_files_fill_gaps() {
        let d = tmp();
        std::fs::write(d.join("product.key"), "  hlp_sk_file\n").unwrap();
        let mut env = HashMap::new();
        env.insert("ESTI_LICENSE_KEY".into(), "K".into());
        env.insert("ESTI_LICENSE_API_URL".into(), "https://hub.example/platform".into());
        let cfg = resolve_from(&env, &d).unwrap();
        assert_eq!(cfg.product_key, "hlp_sk_file"); // trimmed, from file
        assert_eq!(cfg.hub_base, "https://hub.example/platform");
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn store_then_resolve_roundtrips() {
        let d = tmp();
        store_license(&d, "  MY-KEY \n").unwrap();
        let mut env = HashMap::new();
        env.insert("ESTI_PRODUCT_API_KEY".into(), "hlp_sk_x".into());
        let cfg = resolve_from(&env, &d).unwrap();
        assert_eq!(cfg.license_key, "MY-KEY");
        let _ = std::fs::remove_dir_all(&d);
    }
}
