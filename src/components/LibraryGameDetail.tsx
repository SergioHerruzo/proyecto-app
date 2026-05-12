import '../styles/LibraryGameDetail.css'
import { useState, useEffect, useRef } from "react"
import type { Game } from "../types/games"
import {
  getGameAchievements,
  unlockAchievement,
  getGameBuildsAsUser,
  getGameBuildById,
  getCurrentUser,
  getCurrentUserId,
  type AchievementResponse,
  type GameBuildAsUserListItem,
  type GameBuildUserResponse,
} from "../services/api"
import { getBuildPreview, type BuildPreview } from "../services/tauri"
import { getAuthToken } from "../services/api"
import { useDownloads } from "../context/DownloadContext"
import InstallConfirmModal from "./InstallConfirmModal"
import ReportModal from "./ReportModal"

interface LibraryGameDetailProps {
  game: Game
  initialTab?: Tab
}

type Tab = "logros" | "amigos" | "info" | "versiones"

const tabs: { id: Tab; label: string }[] = [
  { id: "info",      label: "Información" },
  { id: "logros",    label: "Logros" },
  { id: "versiones", label: "Versiones" },
  { id: "amigos",    label: "Amigos" },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ---- Switch Version Modal ----
function SwitchVersionModal({
  isInstalled,
  isDownloading,
  installedVersionName,
  targetVersionName,
  onConfirm,
  onCancel,
}: {
  isInstalled: boolean
  isDownloading: boolean
  installedVersionName?: string
  targetVersionName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  let message: string
  if (isInstalled && isDownloading) {
    message = `Hay una descarga activa y el juego ya está instalado (${installedVersionName}). La descarga será cancelada y el juego reinstalado con la versión "${targetVersionName}".`
  } else if (isDownloading) {
    message = `Hay una descarga activa en curso. Será cancelada para instalar la versión "${targetVersionName}".`
  } else {
    message = `El juego ya tiene instalada la versión "${installedVersionName}". Si continúas, será reemplazada por "${targetVersionName}".`
  }

  return (
    <div className="lgd-modal-backdrop" onClick={onCancel}>
      <div className="lgd-modal lgd-modal--confirm" onClick={e => e.stopPropagation()}>
        <div className="lgd-modal-icon lgd-modal-icon--warn">⚠</div>
        <p className="lgd-modal-title">Cambiar versión</p>
        <p className="lgd-modal-message">{message}</p>
        <div className="lgd-modal-actions">
          <button className="lgd-modal-confirm-btn" onClick={onConfirm}>Continuar</button>
          <button className="lgd-modal-dismiss-btn" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ---- Error Modal ----
function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="lgd-modal-backdrop" onClick={onClose}>
      <div className="lgd-modal lgd-modal--error" onClick={e => e.stopPropagation()}>
        <div className="lgd-modal-icon">⚠</div>
        <p className="lgd-modal-message">{message}</p>
        <button className="lgd-modal-close-btn" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}

// ---- Launch Modal ----
function LaunchModal({ gameTitle }: { gameTitle: string }) {
  return (
    <div className="lgd-modal-backdrop lgd-modal-backdrop--transparent">
      <div className="lgd-modal lgd-modal--launch" onClick={e => e.stopPropagation()}>
        <div className="lgd-launch-spinner" />
        <p className="lgd-modal-title">Iniciando {gameTitle}...</p>
        <p className="lgd-modal-sub">El juego se está abriendo</p>
      </div>
    </div>
  )
}

export default function LibraryGameDetail({ game, initialTab }: LibraryGameDetailProps) {
  const { installedGames, downloads, runningGames, startDownload, cancelDownload, launchGame, killGame, uninstallGame } =
    useDownloads()

  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "info")
  const [achievements, setAchievements] = useState<AchievementResponse[]>([])
  const [loadingAchievements, setLoadingAchievements] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  const [builds, setBuilds] = useState<GameBuildAsUserListItem[]>([])
  const [loadingBuilds, setLoadingBuilds] = useState(false)
  const [buildsError, setBuildsError] = useState<string | null>(null)

  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [uninstalling, setUninstalling] = useState(false)

  // Launch modal state
  const [launchModalOpen, setLaunchModalOpen] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const launchStartRef = useRef<number>(0)

  // Install confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingBuild, setPendingBuild] = useState<GameBuildUserResponse | null>(null)
  const [preview, setPreview] = useState<BuildPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Switch version modal state
  const [switchTarget, setSwitchTarget] = useState<GameBuildUserResponse | null>(null)
  const [switchVersionLoading, setSwitchVersionLoading] = useState(false)

  const installedInfo = installedGames[game.id] ?? null
  const downloadProgress = downloads[game.id] ?? null
  const isDownloading =
    downloadProgress?.status === "downloading" || downloadProgress?.status === "queued"
  const isRunning = runningGames.has(game.id)

  // When game starts running, close the modal — but keep it visible at least 400ms
  useEffect(() => {
    if (isRunning && isLaunching) {
      const elapsed = Date.now() - launchStartRef.current
      const remaining = Math.max(0, 400 - elapsed)
      const timer = setTimeout(() => {
        setIsLaunching(false)
        setLaunchModalOpen(false)
      }, remaining)
      return () => clearTimeout(timer)
    }
  }, [isRunning, isLaunching])

  // If initialTab changes (e.g. from context menu "manage builds"), switch tab
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab)
  }, [initialTab])

  const releaseBuild = builds.find((b) => b.isReleaseBuild) ?? null
  const hasUpdate =
    releaseBuild !== null &&
    installedInfo !== null &&
    installedInfo.buildId !== releaseBuild.id

  const isInstalled = installedInfo !== null

  useEffect(() => {
    setAchievements([])
    setUnlockedIds(new Set())
  }, [game.id])

  useEffect(() => {
    if (activeTab !== "logros") return

    const userId = getCurrentUserId()
    setLoadingAchievements(true)
    const fetch = userId
      ? getGameAchievements(game.id, userId)
      : getCurrentUser().then((profile) => getGameAchievements(game.id, profile.userId))

    fetch
      .then((list) => setAchievements(list))
      .catch(console.error)
      .finally(() => setLoadingAchievements(false))
  }, [activeTab, game.id])

  useEffect(() => {
    setBuilds([])
    setBuildsError(null)
    setLoadingBuilds(true)
    getGameBuildsAsUser(game.id)
      .then((page) => setBuilds(page.items))
      .catch(() => setBuildsError("No se pudieron cargar las versiones."))
      .finally(() => setLoadingBuilds(false))
  }, [game.id])

  function openInstallConfirm(buildDetail: GameBuildUserResponse) {
    setPendingBuild(buildDetail)
    setPreview(null)
    setPreviewError(null)
    setPreviewLoading(true)
    setConfirmOpen(true)
    const token = getAuthToken() ?? ""
    getBuildPreview(buildDetail.manifestUrl, token)
      .then((p) => setPreview(p))
      .catch((e: unknown) => setPreviewError(e instanceof Error ? e.message : String(e)))
      .finally(() => setPreviewLoading(false))
  }

  async function handleInstallOrUpdate() {
    if (!releaseBuild) return
    try {
      const buildDetail = await getGameBuildById(releaseBuild.id)
      openInstallConfirm(buildDetail)
    } catch (e: unknown) {
      setErrorModal(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleSelectBuild(build: GameBuildAsUserListItem) {
    setSwitchVersionLoading(true)
    try {
      const buildDetail = await getGameBuildById(build.id)
      const hasConflict = isInstalled || isDownloading
      if (hasConflict) {
        setSwitchTarget(buildDetail)
      } else {
        openInstallConfirm(buildDetail)
      }
    } catch (e: unknown) {
      setErrorModal(e instanceof Error ? e.message : String(e))
    } finally {
      setSwitchVersionLoading(false)
    }
  }

  async function handleConfirmSwitch() {
    if (!switchTarget) return
    const buildDetail = switchTarget
    setSwitchTarget(null)
    if (isDownloading) {
      await cancelDownload(game.id)
    }
    openInstallConfirm(buildDetail)
  }

  async function handleConfirmInstall() {
    if (!pendingBuild) return
    setConfirmOpen(false)
    try {
      await startDownload(game, pendingBuild)
    } catch (e: unknown) {
      setErrorModal(e instanceof Error ? e.message : String(e))
    }
    setPendingBuild(null)
    setPreview(null)
  }

  async function handlePlay() {
    launchStartRef.current = Date.now()
    setLaunchModalOpen(true)
    setIsLaunching(true)
    try {
      await launchGame(game.id)
    } catch (e: unknown) {
      setIsLaunching(false)
      setLaunchModalOpen(false)
      setErrorModal(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleKillGame() {
    try {
      await killGame(game.id)
    } catch (e: unknown) {
      setErrorModal(e instanceof Error ? e.message : String(e))
    }
    setLaunchModalOpen(false)
  }

  async function handleCancel() {
    await cancelDownload(game.id)
  }

  async function handleUninstall() {
    setUninstalling(true)
    try {
      await uninstallGame(game.id)
    } catch (e: unknown) {
      setErrorModal(e instanceof Error ? e.message : String(e))
    } finally {
      setUninstalling(false)
    }
  }

  async function handleUnlock(achievementId: string) {
    setUnlockingId(achievementId)
    try {
      await unlockAchievement(achievementId)
      setUnlockedIds((prev) => new Set(prev).add(achievementId))
    } catch (e) {
      console.error(e)
    } finally {
      setUnlockingId(null)
    }
  }

  const dlPct =
    downloadProgress && downloadProgress.totalBytes > 0
      ? Math.round((downloadProgress.downloadedBytes / downloadProgress.totalBytes) * 100)
      : 0

  return (
    <div className="lgd-wrapper">

      {/* Hero */}
      <div className="lgd-hero" style={{ backgroundImage: `url(${game.image})` }}>
        <div className="lgd-hero-overlay">
          <h1 className="lgd-hero-title">{game.title}</h1>
        </div>
      </div>

      {/* Action bar */}
      <div className="lgd-actionbar">
        {isDownloading ? (
          <div className="lgd-download-compact">
            <span className="lgd-download-label">
              {downloadProgress!.status === "queued" ? "En cola" : `Descargando`}
            </span>
            <span className="lgd-download-pct">{dlPct}%</span>
            {downloadProgress!.totalBytes > 0 && (
              <span className="lgd-download-bytes">
                {formatBytes(downloadProgress!.downloadedBytes)} / {formatBytes(downloadProgress!.totalBytes)}
              </span>
            )}
            <button className="lgd-cancel-btn" onClick={handleCancel}>
              Cancelar ✕
            </button>
          </div>
        ) : (
          <>
            {isRunning ? (
              <button className="lgd-main-btn lgd-main-btn--stop" onClick={handleKillGame}>
                ■ CERRAR JUEGO
              </button>
            ) : isInstalled ? (
              <button className="lgd-main-btn lgd-main-btn--play" onClick={handlePlay}>
                ▶ JUGAR
              </button>
            ) : null}

            {!isInstalled && releaseBuild && (
              <button className="lgd-main-btn lgd-main-btn--install" onClick={handleInstallOrUpdate}>
                ⬇ INSTALAR
              </button>
            )}
            {isInstalled && hasUpdate && releaseBuild && (
              <button className="lgd-main-btn lgd-main-btn--update" onClick={handleInstallOrUpdate}>
                ↑ ACTUALIZAR · {releaseBuild.versioName}
              </button>
            )}
            {!releaseBuild && !isInstalled && (
              <button className="lgd-main-btn lgd-main-btn--play" disabled>
                {loadingBuilds ? "Cargando..." : "Sin versión disponible"}
              </button>
            )}
          </>
        )}

        <button className="lgd-report-btn" onClick={() => setReportOpen(true)}>⚑ Denunciar</button>

        <div className="lgd-stats">
          <div className="lgd-stat">
            <span className="lgd-stat-label">ÚLTIMA SESIÓN</span>
            <span className="lgd-stat-value">—</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">TIEMPO DE JUEGO</span>
            <span className="lgd-stat-value">0 horas</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">LOGROS</span>
            <span className="lgd-stat-value">
              {achievements.length > 0
                ? `${achievements.filter((a) => a.isUnlocked || unlockedIds.has(a.id)).length} / ${achievements.length}`
                : "—"}
            </span>
          </div>
          {installedInfo && (
            <div className="lgd-stat">
              <span className="lgd-stat-label">VERSIÓN</span>
              <span className="lgd-stat-value">{installedInfo.versionName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="lgd-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`lgd-tab ${activeTab === tab.id ? "lgd-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="lgd-content">
        {activeTab === "logros" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">
              LOGROS{" "}
              {achievements.length > 0 &&
                `· ${achievements.filter((a) => a.isUnlocked || unlockedIds.has(a.id)).length} / ${achievements.length}`}
            </span>

            {loadingAchievements && (
              <div className="lgd-empty-state">
                <p className="lgd-empty-title">Cargando logros...</p>
              </div>
            )}

            {!loadingAchievements && achievements.length === 0 && (
              <div className="lgd-empty-state">
                <span className="lgd-empty-icon">🏆</span>
                <p className="lgd-empty-title">Sin logros</p>
                <p className="lgd-empty-sub">Este juego no tiene logros disponibles</p>
              </div>
            )}

            {!loadingAchievements && achievements.length > 0 && (
              <div className="lgd-achievement-list">
                {achievements.map((a) => {
                  const unlocked = a.isUnlocked || unlockedIds.has(a.id)
                  return (
                    <div
                      key={a.id}
                      className={`lgd-achievement${unlocked ? " lgd-achievement--unlocked" : ""}`}
                    >
                      <div className="lgd-achievement-icon">{unlocked ? "🏆" : "🔒"}</div>
                      <div className="lgd-achievement-info">
                        <span className="lgd-achievement-name">{a.name}</span>
                        <span className="lgd-achievement-desc">{a.description}</span>
                        {unlocked && a.unlockedAt && (
                          <span className="lgd-achievement-date">
                            Desbloqueado el{" "}
                            {new Date(a.unlockedAt).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                      {!unlocked && (
                        <button
                          className="lgd-achievement-btn"
                          disabled={unlockingId === a.id}
                          onClick={() => handleUnlock(a.id)}
                        >
                          {unlockingId === a.id ? "..." : "Desbloquear"}
                        </button>
                      )}
                      {unlocked && <span className="lgd-achievement-done">✓ Desbloqueado</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "versiones" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">VERSIONES DISPONIBLES</span>

            {loadingBuilds && builds.length === 0 && (
              <div className="lgd-empty-state">
                <p className="lgd-empty-title">Cargando versiones...</p>
              </div>
            )}

            {!loadingBuilds && buildsError && (
              <div className="lgd-empty-state">
                <p className="lgd-empty-title">{buildsError}</p>
              </div>
            )}

            {!loadingBuilds && !buildsError && builds.length === 0 && (
              <div className="lgd-empty-state">
                <span className="lgd-empty-icon">📦</span>
                <p className="lgd-empty-title">Sin versiones publicadas</p>
                <p className="lgd-empty-sub">
                  El desarrollador aún no ha publicado ninguna versión
                </p>
              </div>
            )}

            {!loadingBuilds && !buildsError && builds.length > 0 && (
              <>
                {hasUpdate && releaseBuild && (
                  <div className="lgd-update-banner">
                    <div className="lgd-update-info">
                      <span className="lgd-update-icon">↑</span>
                      <div>
                        <span className="lgd-update-title">
                          Nueva versión disponible: {releaseBuild.versioName}
                        </span>
                        <span className="lgd-update-sub">
                          Una actualización está lista para instalar
                        </span>
                      </div>
                    </div>
                    <button className="lgd-update-btn" onClick={handleInstallOrUpdate}>
                      Actualizar
                    </button>
                  </div>
                )}
                <div className="lgd-build-list">
                  {builds.map((b) => {
                    const isThisInstalled = installedInfo?.buildId === b.id
                    const isThisDownloading =
                      downloadProgress?.buildId === b.id && isDownloading

                    return (
                      <div
                        key={b.id}
                        className={`lgd-build-row${b.isReleaseBuild ? " lgd-build-row--release" : ""}`}
                      >
                        <div className="lgd-build-info">
                          <span className="lgd-build-name">{b.versioName}</span>
                          {b.isReleaseBuild && (
                            <span className="lgd-build-badge">Recomendada</span>
                          )}
                          {isThisInstalled && (
                            <span className="lgd-build-badge lgd-build-badge--installed">
                              Instalada
                            </span>
                          )}
                          {isThisDownloading && (
                            <span className="lgd-build-badge lgd-build-badge--downloading">
                              Descargando {dlPct}%
                            </span>
                          )}
                        </div>

                        {!isThisInstalled && !isThisDownloading && (
                          <button
                            className="lgd-build-install-btn"
                            onClick={() => handleSelectBuild(b)}
                            disabled={switchVersionLoading}
                          >
                            ⬇ Instalar
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {isInstalled && (
                  <div className="lgd-uninstall-row">
                    <button
                      className="lgd-uninstall-btn"
                      onClick={handleUninstall}
                      disabled={uninstalling || isDownloading}
                    >
                      {uninstalling ? "Desinstalando..." : "🗑 Desinstalar juego"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "amigos" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">AMIGOS QUE JUEGAN A ESTE JUEGO</span>
            <div className="lgd-empty-state">
              <span className="lgd-empty-icon">👥</span>
              <p className="lgd-empty-title">Próximamente</p>
              <p className="lgd-empty-sub">Aquí verás qué amigos juegan a este juego</p>
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">INFORMACIÓN DEL JUEGO</span>
            <div className="lgd-info-grid">
              {game.developer && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Desarrollador</span>
                  <span className="lgd-info-val">{game.developer}</span>
                </div>
              )}
              {game.genres?.length > 0 && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Géneros</span>
                  <span className="lgd-info-val">{game.genres.join(", ")}</span>
                </div>
              )}
              {game.releaseDate && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Fecha de lanzamiento</span>
                  <span className="lgd-info-val">{game.releaseDate}</span>
                </div>
              )}
              {game.description && (
                <div className="lgd-info-row lgd-info-row--block">
                  <span className="lgd-info-key">Descripción</span>
                  <span className="lgd-info-val lgd-info-desc">{game.description}</span>
                </div>
              )}
              {!game.developer && !game.releaseDate && !game.description && (
                <div className="lgd-empty-state">
                  <span className="lgd-empty-icon">ℹ️</span>
                  <p className="lgd-empty-title">Sin información disponible</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Install confirmation modal */}
      {confirmOpen && pendingBuild && (
        <InstallConfirmModal
          gameTitle={game.title}
          versionName={pendingBuild.versionName}
          preview={preview}
          loading={previewLoading}
          error={previewError}
          onConfirm={handleConfirmInstall}
          onCancel={() => { setConfirmOpen(false); setPendingBuild(null) }}
        />
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          gameName={game.title}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason, description) => {
            console.log("[Report]", { gameId: game.id, reason, description })
          }}
        />
      )}

      {/* Switch version confirmation modal */}
      {switchTarget && (
        <SwitchVersionModal
          isInstalled={isInstalled}
          isDownloading={isDownloading}
          installedVersionName={installedInfo?.versionName}
          targetVersionName={switchTarget.versionName}
          onConfirm={handleConfirmSwitch}
          onCancel={() => setSwitchTarget(null)}
        />
      )}

      {/* Error modal */}
      {errorModal && (
        <ErrorModal message={errorModal} onClose={() => setErrorModal(null)} />
      )}

      {/* Launch modal — shows while game is starting, auto-closes on game-launched */}
      {launchModalOpen && <LaunchModal gameTitle={game.title} />}
    </div>
  )
}
