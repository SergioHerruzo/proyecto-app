import "../styles/DownloadsPanel.css"
import { useDownloads } from "../context/DownloadContext"
import type { DownloadProgress } from "../services/tauri"

interface DownloadsPanelProps {
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function statusLabel(dl: DownloadProgress): string {
  switch (dl.status) {
    case "downloading": return "Descargando..."
    case "queued":      return "En cola..."
    case "completed":   return "Completado"
    case "cancelled":   return "Cancelado"
    case "error":       return `Error: ${dl.error ?? "desconocido"}`
  }
}

export default function DownloadsPanel({ onClose }: DownloadsPanelProps) {
  const { downloads, cancelDownload } = useDownloads()

  const entries = Object.values(downloads)
  const active = entries.filter(
    (d) => d.status === "downloading" || d.status === "queued",
  )
  const finished = entries.filter(
    (d) => d.status === "completed" || d.status === "error" || d.status === "cancelled",
  )

  const sorted = [...active, ...finished]

  return (
    <div className="dlp-backdrop" onClick={onClose}>
      <div className="dlp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="dlp-header">
          <span className="dlp-title">Descargas</span>
          <button className="dlp-close" onClick={onClose}>✕</button>
        </div>

        {sorted.length === 0 ? (
          <div className="dlp-empty">
            <span className="dlp-empty-icon">↓</span>
            <p>No hay descargas activas</p>
          </div>
        ) : (
          <div className="dlp-list">
            {sorted.map((dl) => {
              const pct =
                dl.totalBytes > 0
                  ? Math.round((dl.downloadedBytes / dl.totalBytes) * 100)
                  : dl.status === "completed" ? 100 : 0
              const isActive =
                dl.status === "downloading" || dl.status === "queued"

              return (
                <div
                  key={dl.gameId}
                  className={`dlp-item dlp-item--${dl.status}`}
                >
                  <div className="dlp-item-top">
                    <span className="dlp-game-title">{dl.gameTitle}</span>
                    {isActive && (
                      <button
                        className="dlp-cancel-btn"
                        onClick={() => cancelDownload(dl.gameId)}
                        title="Cancelar"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="dlp-bar-row">
                    <div className="dlp-bar-track">
                      <div
                        className="dlp-bar-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="dlp-pct">{pct}%</span>
                  </div>

                  <div className="dlp-item-bottom">
                    <span className="dlp-status">{statusLabel(dl)}</span>
                    {dl.totalBytes > 0 && (
                      <span className="dlp-bytes">
                        {formatBytes(dl.downloadedBytes)} / {formatBytes(dl.totalBytes)}
                      </span>
                    )}
                    {dl.totalFiles > 0 && (
                      <span className="dlp-files">
                        {dl.completedFiles} / {dl.totalFiles} archivos
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
