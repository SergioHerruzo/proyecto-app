import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export interface InstallInfo {
  gameId: string
  buildId: string
  versionName: string
  executableFilePath: string
  installedAt: string
}

export type DownloadStatus = "queued" | "downloading" | "completed" | "error" | "cancelled"

export interface DownloadProgress {
  gameId: string
  buildId: string
  gameTitle: string
  totalBytes: number
  downloadedBytes: number
  totalFiles: number
  completedFiles: number
  status: DownloadStatus
  error?: string
}

export interface BuildPreview {
  fileCount: number
  totalBytes: number
}

export interface DownloadBuildParams {
  gameId: string
  gameTitle: string
  buildId: string
  versionName: string
  manifestUrl: string
  executableFilePath: string
  authToken: string
  apiBaseUrl: string
}

export const getBuildPreview = (manifestUrl: string, authToken: string): Promise<BuildPreview> =>
  invoke("get_build_preview", { manifestUrl, authToken })

export const getInstalledGames = (): Promise<Record<string, InstallInfo>> =>
  invoke("get_installed_games")

export const downloadBuild = (
  params: DownloadBuildParams,
): Promise<void> =>
  invoke("download_build", { ...params })

export const launchGame = (gameId: string): Promise<void> =>
  invoke("launch_game", { gameId })

export const killGame = (gameId: string): Promise<void> =>
  invoke("kill_game", { gameId })

export const getRunningGames = (): Promise<string[]> =>
  invoke("get_running_games")

export const openInstallFolder = (gameId: string): Promise<void> =>
  invoke("open_install_folder", { gameId })

export const cancelDownload = (gameId: string): Promise<void> =>
  invoke("cancel_download", { gameId })

export const uninstallGame = (gameId: string): Promise<void> =>
  invoke("uninstall_game", { gameId })

export const getDownloadsState = (): Promise<Record<string, DownloadProgress>> =>
  invoke("get_downloads_state")

export function onDownloadProgress(
  cb: (progress: DownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgress>("download-progress", (event) => cb(event.payload))
}

export function onGameLaunched(cb: (gameId: string) => void): Promise<UnlistenFn> {
  return listen<string>("game-launched", (event) => cb(event.payload))
}

export function onGameStopped(cb: (gameId: string) => void): Promise<UnlistenFn> {
  return listen<string>("game-stopped", (event) => cb(event.payload))
}
