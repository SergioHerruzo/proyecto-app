mod commands;
mod downloader;
mod install_state;

use commands::DownloadManagerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DownloadManagerState::new())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_installed_games,
            commands::download_build,
            commands::launch_game,
            commands::get_downloads_state,
            commands::cancel_download,
            commands::uninstall_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
