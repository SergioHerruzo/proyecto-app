use crate::downloader::{DownloadParams, DownloadProgress, DownloadStatus, run_download};
use crate::install_state::{game_data_dir, game_files_dir, load_install_info, InstallInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, State};

pub struct DownloadManagerState {
    pub downloads: Arc<Mutex<HashMap<String, DownloadProgress>>>,
    pub cancel_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    pub running_games: Arc<Mutex<HashMap<String, u32>>>,
}

impl DownloadManagerState {
    pub fn new() -> Self {
        Self {
            downloads: Arc::new(Mutex::new(HashMap::new())),
            cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            running_games: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ---- Build preview (for confirmation dialog) ----

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildPreview {
    pub file_count: usize,
    pub total_bytes: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct PreviewFile {
    size: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct PreviewManifest {
    files: Vec<PreviewFile>,
}

#[tauri::command]
pub async fn get_build_preview(
    manifest_url: String,
    _auth_token: String,
) -> Result<BuildPreview, String> {
    let client = reqwest::Client::new();
    // Manifest URL is a pre-signed storage URL — no Bearer token needed
    let resp = client
        .get(&manifest_url)
        .send()
        .await
        .map_err(|e| format!("Error al obtener manifest: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("Manifest devolvió estado {}", resp.status()));
    }

    let manifest: PreviewManifest = resp
        .json()
        .await
        .map_err(|e| format!("Error al parsear manifest: {}", e))?;

    Ok(BuildPreview {
        file_count: manifest.files.len(),
        total_bytes: manifest.files.iter().map(|f| f.size).sum(),
    })
}

// ---- Installed games ----

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

    // Emit Queued immediately so the frontend shows feedback right away
    let queued = DownloadProgress {
        game_id: game_id.clone(),
        build_id: build_id.clone(),
        game_title: game_title.clone(),
        total_bytes: 0,
        downloaded_bytes: 0,
        total_files: 0,
        completed_files: 0,
        status: DownloadStatus::Queued,
        error: None,
    };
    {
        let mut map = downloads_arc.lock().unwrap();
        map.insert(game_id.clone(), queued.clone());
    }
    let _ = app.emit("download-progress", &queued);

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
    let downloads_for_error = Arc::clone(&downloads_arc);
    let app_for_error = app.clone();

    tauri::async_runtime::spawn(async move {
        let result = run_download(app_clone, params, cancel_clone.clone(), downloads_arc).await;

        if let Err(ref e) = result {
            log::error!("Download error for {}: {}", game_id, e);
            // Emit error if run_download failed before emitting its own error event
            let mut map = downloads_for_error.lock().unwrap();
            if let Some(p) = map.get(&game_id).cloned() {
                if p.status == DownloadStatus::Queued || p.status == DownloadStatus::Downloading {
                    let is_cancelled = cancel_clone.load(Ordering::Relaxed)
                        || e.contains("Cancelled");
                    let error_p = DownloadProgress {
                        status: if is_cancelled {
                            DownloadStatus::Cancelled
                        } else {
                            DownloadStatus::Error
                        },
                        error: Some(e.clone()),
                        ..p
                    };
                    map.insert(game_id.clone(), error_p.clone());
                    drop(map);
                    let _ = app_for_error.emit("download-progress", &error_p);
                }
            }
        }

        // Clean up cancel token
        let mut tokens = cancel_tokens_arc.lock().unwrap();
        tokens.remove(&game_id);
    });

    Ok(())
}

#[tauri::command]
pub async fn launch_game(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    game_id: String,
) -> Result<(), String> {
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

    let mut child = std::process::Command::new(&exe_path)
        .current_dir(&game_dir)
        .spawn()
        .map_err(|e| format!("Error al lanzar el juego: {}", e))?;

    let pid = child.id();
    {
        let mut running = state.running_games.lock().unwrap();
        running.insert(game_id.clone(), pid);
    }

    let _ = app.emit("game-launched", &game_id);

    // Monitor process exit in background so we can emit game-stopped when
    // the user closes the game manually (not via kill_game).
    let app_monitor = app.clone();
    let running_arc = Arc::clone(&state.running_games);
    let game_id_monitor = game_id.clone();
    std::thread::spawn(move || {
        let _ = child.wait();
        let mut running = running_arc.lock().unwrap();
        running.remove(&game_id_monitor);
        drop(running);
        let _ = app_monitor.emit("game-stopped", &game_id_monitor);
    });

    Ok(())
}

#[tauri::command]
pub async fn kill_game(
    app: AppHandle,
    state: State<'_, DownloadManagerState>,
    game_id: String,
) -> Result<(), String> {
    let pid = {
        let running = state.running_games.lock().unwrap();
        running.get(&game_id).cloned()
    };

    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| format!("Error al cerrar el juego: {}", e))?;

        #[cfg(not(target_os = "windows"))]
        unsafe {
            libc::kill(pid as i32, libc::SIGTERM);
        }

        let mut running = state.running_games.lock().unwrap();
        running.remove(&game_id);

        let _ = app.emit("game-stopped", &game_id);
    }

    Ok(())
}

#[tauri::command]
pub async fn get_running_games(
    state: State<'_, DownloadManagerState>,
) -> Result<Vec<String>, String> {
    let running = state.running_games.lock().unwrap();
    Ok(running.keys().cloned().collect())
}

#[tauri::command]
pub async fn open_install_folder(app: AppHandle, game_id: String) -> Result<(), String> {
    let game_dir = game_files_dir(&app, &game_id);
    if !game_dir.exists() {
        return Err("El juego no está instalado".to_string());
    }

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&game_dir)
        .spawn()
        .map_err(|e| format!("Error al abrir carpeta: {}", e))?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&game_dir)
        .spawn()
        .map_err(|e| format!("Error al abrir carpeta: {}", e))?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&game_dir)
        .spawn()
        .map_err(|e| format!("Error al abrir carpeta: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_downloads_state(
    state: State<'_, DownloadManagerState>,
) -> Result<HashMap<String, DownloadProgress>, String> {
    Ok(state.downloads.lock().unwrap().clone())
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
