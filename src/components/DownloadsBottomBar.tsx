import "../styles/DownloadsBottomBar.css"
import { useDownloads } from "../context/DownloadContext"

interface DownloadsBottomBarProps {
  onNavigateToDownloads: () => void
}

export default function DownloadsBottomBar({ onNavigateToDownloads }: DownloadsBottomBarProps) {
  const { downloads, cancelDownload } = useDownloads()

  const activeDownloads = Object.values(downloads).filter(
    (d) => d.status === "downloading" || d.status === "queued",
  )

  const primary = activeDownloads[0] ?? null
  const extraCount = activeDownloads.length - 1

  const pct = primary && primary.totalBytes > 0
    ? Math.round((primary.downloadedBytes / primary.totalBytes) * 100)
    : primary?.status === "queued" ? 0 : 0

  return (
    <div className="dbb-bar">
      <div className="dbb-inner">
        {primary && (
          <div className="dbb-active">
            <span className="dbb-label">Descargando</span>
            <span className="dbb-game-title">{primary.gameTitle}</span>
            <span className="dbb-pct">{pct}%</span>
            {extraCount > 0 && (
              <span className="dbb-extra">+{extraCount} más</span>
            )}
            <button
              className="dbb-cancel"
              onClick={(e) => { e.stopPropagation(); cancelDownload(primary.gameId) }}
              title="Cancelar descarga"
            >
              ✕
            </button>
          </div>
        )}

        <button className="dbb-manage-btn" onClick={onNavigateToDownloads}>
          Gestionar descargas
          {activeDownloads.length > 0 && (
            <span className="dbb-badge">{activeDownloads.length}</span>
          )}
        </button>
      </div>
    </div>
  )
}
