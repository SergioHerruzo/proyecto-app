use crate::downloader::{DownloadParams, DownloadProgress, DownloadStatus, run_download};
use crate::install_state::{game_data_dir, game_files_dir, load_install_info, InstallInfo};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};

pub struct DownloadManagerState {
    pub downloads: Arc<Mutex<HashMap<String, DownloadProgress>>>,
    pub cancel_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl DownloadManagerState {
    pub fn new() -> Self {
        Self {
            downloads: Arc::new(Mutex::new(HashMap::new())),
            cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn get_installed_games(
    app: AppHandle,
) -> Result<HashMap<String, InstallInfo>, String> {
    let games_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("games");

    let mut result = HashMap::new();

    if !games_dir.exists() {
        return Ok(result);
    }

    let entries = std::fs::read_dir(&games_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let install_path = entry.path().join("install.json");
        if install_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&install_path) {
                if let Ok(info) = serde_json::from_str::<InstallInfo>(&content) {
                    result.insert(info.game_id.clone(), info);
                }
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn download_build(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    game_id: String,
    game_title: String,
    build_id: String,
    version_name: String,
    manifest_url: String,
    executable_file_path: String,
    auth_token: String,
    api_base_url: String,
) -> Result<(), String> {
    // Reject if already downloading
    {
        let map = state.downloads.lock().unwrap();
        if let Some(dl) = map.get(&game_id) {
            if dl.status == DownloadStatus::Downloading || dl.status == DownloadStatus::Queued {
                return Err("Ya hay una descarga en curso para este juego".to_string());
            }
        }
    }

    let cancel_token = Arc::new(AtomicBool::new(false));
    {
        let mut tokens = state.cancel_tokens.lock().unwrap();
        tokens.insert(game_id.clone(), cancel_token.clone());
    }

    let downloads_arc = Arc::clone(&state.downloads);

    let params = DownloadParams {
        game_id: game_id.clone(),
        game_title,
        build_id,
        version_name,
        manifest_url,
        executable_file_path,
        auth_token,
        api_base_url,
    };

    let app_clone = app.clone();
    let cancel_clone = cancel_token.clone();
    let state_handle = app.state::<DownloadManagerState>();
    let cancel_tokens_arc = Arc::clone(&state_handle.cancel_tokens);

    tauri::async_runtime::spawn(async move {
        let result = run_download(app_clone, params, cancel_clone.clone(), downloads_arc).await;

        if let Err(ref e) = result {
            log::error!("Download error for {}: {}", game_id, e);
        }

        // Clean up cancel token after completion
        let mut tokens = cancel_tokens_arc.lock().unwrap();
        tokens.remove(&game_id);
    });

    Ok(())
}

#[tauri::command]
pub async fn launch_game(app: AppHandle, game_id: String) -> Result<(), String> {
    let info = load_install_info(&app, &game_id)
        .ok_or_else(|| "El juego no está instalado".to_string())?;

    let game_dir = game_files_dir(&app, &game_id);
    let exe_path = info
        .executable_file_path
        .split('/')
        .fold(game_dir.clone(), |acc, p| acc.join(p));

    if !exe_path.exists() {
        return Err(format!(
            "Ejecutable no encontrado: {}",
            exe_path.display()
        ));
    }

    std::process::Command::new(&exe_path)
        .current_dir(&game_dir)
        .spawn()
        .map_err(|e| format!("Error al lanzar el juego: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_downloads_state(
    state: State<'_, DownloadManagerState>,
) -> HashMap<String, DownloadProgress> {
    state.downloads.lock().unwrap().clone()
}

#[tauri::command]
pub async fn cancel_download(
    state: State<'_, DownloadManagerState>,
    game_id: String,
) -> Result<(), String> {
    let tokens = state.cancel_tokens.lock().unwrap();
    if let Some(token) = tokens.get(&game_id) {
        token.store(true, Ordering::Relaxed);
    }
    Ok(())
}

#[tauri::command]
pub async fn uninstall_game(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    game_id: String,
) -> Result<(), String> {
    {
        let map = state.downloads.lock().unwrap();
        if let Some(dl) = map.get(&game_id) {
            if dl.status == DownloadStatus::Downloading {
                return Err("No se puede desinstalar mientras se descarga".to_string());
            }
        }
    }

    let game_dir = game_data_dir(&app, &game_id);
    if game_dir.exists() {
        std::fs::remove_dir_all(&game_dir).map_err(|e| e.to_string())?;
    }

    // Remove from downloads state
    {
        let mut map = state.downloads.lock().unwrap();
        map.remove(&game_id);
    }

    Ok(())
}
