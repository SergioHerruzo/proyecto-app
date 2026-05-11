import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import {
  getInstalledGames,
  downloadBuild,
  launchGame as tauriLaunchGame,
  cancelDownload as tauriCancelDownload,
  uninstallGame as tauriUninstallGame,
  onDownloadProgress,
  type InstallInfo,
  type DownloadProgress,
  type DownloadBuildParams,
} from "../services/tauri"
import { getAuthToken, getBaseUrl, type GameBuildUserResponse } from "../services/api"
import { isTauri } from "../utils/platform"
import type { Game } from "../types/games"

interface DownloadContextValue {
  downloads: Record<string, DownloadProgress>
  installedGames: Record<string, InstallInfo>
  startDownload: (game: Game, build: GameBuildUserResponse) => Promise<void>
  cancelDownload: (gameId: string) => Promise<void>
  launchGame: (gameId: string) => Promise<void>
  uninstallGame: (gameId: string) => Promise<void>
  refreshInstalled: () => Promise<void>
}

const DownloadContext = createContext<DownloadContextValue | null>(null)

export function useDownloads(): DownloadContextValue {
  const ctx = useContext(DownloadContext)
  if (!ctx) throw new Error("useDownloads must be used inside DownloadProvider")
  return ctx
}

interface DownloadProviderProps {
  children: ReactNode
  isAuthenticated: boolean
}

export function DownloadProvider({ children, isAuthenticated }: DownloadProviderProps) {
  const [downloads, setDownloads] = useState<Record<string, DownloadProgress>>({})
  const [installedGames, setInstalledGames] = useState<Record<string, InstallInfo>>({})
  const unlistenRef = useRef<(() => void) | null>(null)

  const refreshInstalled = useCallback(async () => {
    if (!isTauri) return
    try {
      const installed = await getInstalledGames()
      setInstalledGames(installed)
    } catch (e) {
      console.error("[DownloadContext] refreshInstalled error:", e)
    }
  }, [])

  // Subscribe to download-progress events (Tauri only)
  useEffect(() => {
    if (!isTauri) return
    let active = true
    onDownloadProgress((progress) => {
      if (!active) return
      setDownloads((prev) => ({ ...prev, [progress.gameId]: progress }))
      if (progress.status === "completed") {
        refreshInstalled()
      }
    }).then((unlisten) => {
      if (!active) {
        unlisten()
      } else {
        unlistenRef.current = unlisten
      }
    })

    return () => {
      active = false
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [refreshInstalled])

  // Load installed games when user is authenticated (Tauri only)
  useEffect(() => {
    if (!isTauri) return
    if (isAuthenticated) {
      refreshInstalled()
    } else {
      setInstalledGames({})
    }
  }, [isAuthenticated, refreshInstalled])

  const startDownload = useCallback(
    async (game: Game, build: GameBuildUserResponse) => {
      if (!isTauri) return
      const authToken = getAuthToken()
      if (!authToken) throw new Error("No autenticado")

      const params: DownloadBuildParams = {
        gameId: game.id,
        gameTitle: game.title,
        buildId: build.buildId,
        versionName: build.versionName,
        manifestUrl: build.manifestUrl,
        executableFilePath: build.executableFilePath,
        authToken,
        apiBaseUrl: getBaseUrl(),
      }

      await downloadBuild(params)
    },
    [],
  )

  const cancelDownload = useCallback(async (gameId: string) => {
    if (!isTauri) return
    await tauriCancelDownload(gameId)
  }, [])

  const launchGame = useCallback(async (gameId: string) => {
    if (!isTauri) return
    await tauriLaunchGame(gameId)
  }, [])

  const uninstallGame = useCallback(async (gameId: string) => {
    if (!isTauri) return
    await tauriUninstallGame(gameId)
    setInstalledGames((prev) => {
      const copy = { ...prev }
      delete copy[gameId]
      return copy
    })
    setDownloads((prev) => {
      const copy = { ...prev }
      delete copy[gameId]
      return copy
    })
  }, [])

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        installedGames,
        startDownload,
        cancelDownload,
        launchGame,
        uninstallGame,
        refreshInstalled,
      }}
    >
      {children}
    </DownloadContext.Provider>
  )
}
