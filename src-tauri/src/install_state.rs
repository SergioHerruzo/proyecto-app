use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallInfo {
    pub game_id: String,
    pub build_id: String,
    pub version_name: String,
    pub executable_file_path: String,
    pub installed_at: String,
}

/// Entry from the build manifest JSON
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct ManifestEntry {
    pub id: String,
    /// Full storage path: "games/{gameId}/Builds/{buildId}/relative/path"
    pub name: String,
    pub content_type: String,
    pub size: u64,
    pub hash: String,
    pub hash_algorithm: String,
}

impl ManifestEntry {
    /// Strips the storage prefix and returns the file's relative install path.
    /// Name format: "games/{gameId}/Builds/{buildId}/rest/of/path"
    pub fn relative_install_path(&self) -> String {
        // Split at most 5 parts by '/'
        let parts: Vec<&str> = self.name.splitn(5, '/').collect();
        if parts.len() == 5 {
            parts[4].to_string()
        } else {
            self.name.clone()
        }
    }
}

pub fn game_data_dir(app: &AppHandle, game_id: &str) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join("games")
        .join(game_id)
}

pub fn game_files_dir(app: &AppHandle, game_id: &str) -> PathBuf {
    game_data_dir(app, game_id).join("files")
}

pub fn load_install_info(app: &AppHandle, game_id: &str) -> Option<InstallInfo> {
    let path = game_data_dir(app, game_id).join("install.json");
    let content = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

pub fn save_install_info(app: &AppHandle, info: &InstallInfo) -> Result<(), String> {
    let dir = game_data_dir(app, &info.game_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("install.json");
    let content = serde_json::to_string_pretty(info).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}

pub fn load_manifest(app: &AppHandle, game_id: &str) -> Vec<ManifestEntry> {
    let path = game_data_dir(app, game_id).join("manifest.json");
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return vec![],
    };
    serde_json::from_str(&content).unwrap_or_default()
}

pub fn save_manifest(
    app: &AppHandle,
    game_id: &str,
    entries: &[ManifestEntry],
) -> Result<(), String> {
    let dir = game_data_dir(app, game_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("manifest.json");
    let content = serde_json::to_string_pretty(entries).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())
}
