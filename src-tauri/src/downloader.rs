use crate::install_state::{
    game_files_dir, load_manifest, save_install_info, save_manifest, InstallInfo, ManifestEntry,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Semaphore;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Completed,
    Error,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub game_id: String,
    pub build_id: String,
    pub game_title: String,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub total_files: usize,
    pub completed_files: usize,
    pub status: DownloadStatus,
    pub error: Option<String>,
}

pub struct DownloadParams {
    pub game_id: String,
    pub game_title: String,
    pub build_id: String,
    pub version_name: String,
    pub manifest_url: String,
    pub executable_file_path: String,
    pub auth_token: String,
    pub api_base_url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "PascalCase")]
struct ManifestResponse {
    files: Vec<ManifestEntry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FileApiResponse {
    relative_path: String,
    download_url: String,
}

fn emit_progress(app: &AppHandle, progress: &DownloadProgress) {
    let _ = app.emit("download-progress", progress);
}

pub async fn run_download(
    app: AppHandle,
    params: DownloadParams,
    cancel_token: Arc<AtomicBool>,
    downloads_map: Arc<std::sync::Mutex<HashMap<String, DownloadProgress>>>,
) -> Result<(), String> {
    let client = Arc::new(reqwest::Client::new());

    // -- 1. Fetch manifest --
    let manifest_resp = client
        .get(&params.manifest_url)
        .header(
            "Authorization",
            format!("Bearer {}", params.auth_token),
        )
        .send()
        .await
        .map_err(|e| format!("Error al obtener el manifest: {}", e))?;

    if !manifest_resp.status().is_success() {
        return Err(format!(
            "Manifest devolvió estado: {}",
            manifest_resp.status()
        ));
    }

    let manifest: ManifestResponse = manifest_resp
        .json()
        .await
        .map_err(|e| format!("Error al parsear manifest: {}", e))?;

    let new_files = manifest.files;

    // -- 2. Diff against old manifest for incremental update --
    let old_files = load_manifest(&app, &params.game_id);
    let old_by_name: HashMap<String, &ManifestEntry> =
        old_files.iter().map(|f| (f.name.clone(), f)).collect();
    let new_by_name: HashMap<String, &ManifestEntry> =
        new_files.iter().map(|f| (f.name.clone(), f)).collect();

    let to_download: Vec<&ManifestEntry> = new_files
        .iter()
        .filter(|f| match old_by_name.get(&f.name) {
            None => true,
            Some(old) => old.hash.to_lowercase() != f.hash.to_lowercase(),
        })
        .collect();

    let to_delete: Vec<&ManifestEntry> = old_files
        .iter()
        .filter(|f| !new_by_name.contains_key(&f.name))
        .collect();

    let total_bytes: u64 = to_download.iter().map(|f| f.size).sum();
    let total_files = to_download.len();

    // -- 3. Emit initial progress --
    let initial = DownloadProgress {
        game_id: params.game_id.clone(),
        build_id: params.build_id.clone(),
        game_title: params.game_title.clone(),
        total_bytes,
        downloaded_bytes: 0,
        total_files,
        completed_files: 0,
        status: DownloadStatus::Downloading,
        error: None,
    };
    {
        let mut map = downloads_map.lock().unwrap();
        map.insert(params.game_id.clone(), initial.clone());
    }
    emit_progress(&app, &initial);

    // -- 4. Batch-fetch download URLs (10 concurrent) --
    let sem_fetch = Arc::new(Semaphore::new(10));
    let auth = Arc::new(params.auth_token.clone());
    let api_base = Arc::new(params.api_base_url.clone());

    let mut fetch_handles = Vec::new();
    for entry in &to_download {
        let sem = sem_fetch.clone();
        let c = client.clone();
        let a = auth.clone();
        let base = api_base.clone();
        let file_id = entry.id.clone();
        let entry_clone = (*entry).clone();

        let handle = tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            let url = format!("{}/game-builds/files/{}", base, file_id);
            let resp = c
                .get(&url)
                .header("Authorization", format!("Bearer {}", a))
                .send()
                .await
                .map_err(|e| e.to_string())?;

            if !resp.status().is_success() {
                return Err(format!("File API error {}: {}", file_id, resp.status()));
            }

            let info: FileApiResponse = resp.json().await.map_err(|e| e.to_string())?;
            Ok::<(ManifestEntry, String, String), String>((
                entry_clone,
                info.relative_path,
                info.download_url,
            ))
        });
        fetch_handles.push(handle);
    }

    let mut file_infos: Vec<(ManifestEntry, String, String)> = Vec::new();
    for handle in fetch_handles {
        match handle.await {
            Ok(Ok(info)) => file_infos.push(info),
            Ok(Err(e)) => return Err(e),
            Err(e) => return Err(e.to_string()),
        }
    }

    // -- 5. Delete files removed in new manifest --
    let install_dir = game_files_dir(&app, &params.game_id);
    for entry in &to_delete {
        let rel = entry.relative_install_path();
        let path = rel
            .split('/')
            .fold(install_dir.clone(), |acc, p| acc.join(p));
        if path.exists() {
            let _ = std::fs::remove_file(&path);
        }
    }

    // -- 6. Download files (3 concurrent) --
    if file_infos.is_empty() {
        // Nothing to download — just update install info
    } else {
        let sem_dl = Arc::new(Semaphore::new(3));
        let downloaded_bytes = Arc::new(AtomicU64::new(0));
        let completed_files = Arc::new(AtomicUsize::new(0));
        let last_emitted_pct = Arc::new(AtomicU64::new(0));
        let install_dir = Arc::new(install_dir);
        let app_arc = Arc::new(app.clone());
        let dlmap = downloads_map.clone();

        let mut dl_handles = Vec::new();
        for (entry, relative_path, download_url) in file_infos {
            if cancel_token.load(Ordering::Relaxed) {
                return Err("Cancelled".to_string());
            }

            let sem = sem_dl.clone();
            let c = client.clone();
            let cancel = cancel_token.clone();
            let dl_bytes = downloaded_bytes.clone();
            let cpl = completed_files.clone();
            let last_pct = last_emitted_pct.clone();
            let app_ref = app_arc.clone();
            let dlm = dlmap.clone();
            let game_id = params.game_id.clone();
            let build_id = params.build_id.clone();
            let game_title = params.game_title.clone();
            let dir = install_dir.clone();
            let expected_hash = entry.hash.clone();
            let total_b = total_bytes;
            let total_f = total_files;

            let handle = tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();

                if cancel.load(Ordering::Relaxed) {
                    return Err("Cancelled".to_string());
                }

                let dest = relative_path
                    .split('/')
                    .fold((*dir).clone(), |acc, p| acc.join(p));

                if let Some(parent) = dest.parent() {
                    tokio::fs::create_dir_all(parent)
                        .await
                        .map_err(|e| e.to_string())?;
                }

                let resp = c
                    .get(&download_url)
                    .send()
                    .await
                    .map_err(|e| e.to_string())?;

                if !resp.status().is_success() {
                    return Err(format!("Descarga falló: {}", resp.status()));
                }

                let mut stream = resp.bytes_stream();
                let mut hasher = Sha256::new();
                let mut file_buf: Vec<u8> = Vec::new();

                while let Some(chunk) = stream.next().await {
                    if cancel.load(Ordering::Relaxed) {
                        return Err("Cancelled".to_string());
                    }
                    let chunk = chunk.map_err(|e| e.to_string())?;
                    hasher.update(&chunk);
                    let chunk_len = chunk.len() as u64;
                    file_buf.extend_from_slice(&chunk);

                    if total_b > 0 {
                        let new_total =
                            dl_bytes.fetch_add(chunk_len, Ordering::Relaxed) + chunk_len;
                        let new_pct = new_total * 20 / total_b; // 5% buckets
                        let prev = last_pct.fetch_max(new_pct, Ordering::Relaxed);
                        if prev < new_pct {
                            let cpl_now = cpl.load(Ordering::Relaxed);
                            let p = DownloadProgress {
                                game_id: game_id.clone(),
                                build_id: build_id.clone(),
                                game_title: game_title.clone(),
                                total_bytes: total_b,
                                downloaded_bytes: new_total,
                                total_files: total_f,
                                completed_files: cpl_now,
                                status: DownloadStatus::Downloading,
                                error: None,
                            };
                            {
                                let mut map = dlm.lock().unwrap();
                                map.insert(game_id.clone(), p.clone());
                            }
                            emit_progress(&app_ref, &p);
                        }
                    }
                }

                // Verify hash
                let hash = hex::encode(hasher.finalize());
                if hash.to_lowercase() != expected_hash.to_lowercase() {
                    return Err(format!(
                        "Hash incorrecto para {}: esperado {}, obtenido {}",
                        relative_path, expected_hash, hash
                    ));
                }

                tokio::fs::write(&dest, &file_buf)
                    .await
                    .map_err(|e| e.to_string())?;

                let cpl_now = cpl.fetch_add(1, Ordering::Relaxed) + 1;
                let dl_now = dl_bytes.load(Ordering::Relaxed);
                let p = DownloadProgress {
                    game_id: game_id.clone(),
                    build_id: build_id.clone(),
                    game_title: game_title.clone(),
                    total_bytes: total_b,
                    downloaded_bytes: dl_now,
                    total_files: total_f,
                    completed_files: cpl_now,
                    status: DownloadStatus::Downloading,
                    error: None,
                };
                {
                    let mut map = dlm.lock().unwrap();
                    map.insert(game_id.clone(), p.clone());
                }
                emit_progress(&app_ref, &p);

                Ok::<(), String>(())
            });
            dl_handles.push(handle);
        }

        for handle in dl_handles {
            match handle.await {
                Ok(Ok(())) => {}
                Ok(Err(e)) => {
                    let is_cancelled = e.contains("Cancelled")
                        || cancel_token.load(Ordering::Relaxed);
                    let status = if is_cancelled {
                        DownloadStatus::Cancelled
                    } else {
                        DownloadStatus::Error
                    };
                    let p = DownloadProgress {
                        game_id: params.game_id.clone(),
                        build_id: params.build_id.clone(),
                        game_title: params.game_title.clone(),
                        total_bytes,
                        downloaded_bytes: downloaded_bytes.load(Ordering::Relaxed),
                        total_files,
                        completed_files: completed_files.load(Ordering::Relaxed),
                        status,
                        error: Some(e.clone()),
                    };
                    {
                        let mut map = downloads_map.lock().unwrap();
                        map.insert(params.game_id.clone(), p.clone());
                    }
                    emit_progress(&app, &p);
                    return Err(e);
                }
                Err(e) => return Err(e.to_string()),
            }
        }
    }

    // -- 7. Save manifest and install info --
    save_manifest(&app, &params.game_id, &new_files)?;

    let installed_at = {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        secs.to_string()
    };

    save_install_info(
        &app,
        &InstallInfo {
            game_id: params.game_id.clone(),
            build_id: params.build_id.clone(),
            version_name: params.version_name.clone(),
            executable_file_path: params.executable_file_path.clone(),
            installed_at,
        },
    )?;

    let final_progress = DownloadProgress {
        game_id: params.game_id.clone(),
        build_id: params.build_id.clone(),
        game_title: params.game_title.clone(),
        total_bytes,
        downloaded_bytes: total_bytes,
        total_files,
        completed_files: total_files,
        status: DownloadStatus::Completed,
        error: None,
    };
    {
        let mut map = downloads_map.lock().unwrap();
        map.insert(params.game_id.clone(), final_progress.clone());
    }
    emit_progress(&app, &final_progress);

    Ok(())
}
