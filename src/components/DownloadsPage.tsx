import "../styles/DownloadsPage.css"
import { useDownloads } from "../context/DownloadContext"
import type { DownloadProgress } from "../services/tauri"

interface DownloadsPageProps {
  onBack: () => void
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
    case "downloading": return "Descargando"
    case "queued":      return "En cola"
    case "completed":   return "Completado"
    case "cancelled":   return "Cancelado"
    case "error":       return `Error: ${dl.error ?? "desconocido"}`
  }
}

function statusColor(status: DownloadProgress["status"]): string {
  switch (status) {
    case "downloading": return "#a78bfa"
    case "queued":      return "#facc15"
    case "completed":   return "#34d399"
    case "cancelled":   return "#888"
    case "error":       return "#f87171"
  }
}

export default function DownloadsPage({ onBack }: DownloadsPageProps) {
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
    <div className="dp-page">
      <div className="dp-header">
        <button className="dp-back" onClick={onBack}>← Volver</button>
        <h1 className="dp-title">Descargas</h1>
        {active.length > 0 && (
          <span className="dp-active-count">{active.length} activa{active.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="dp-empty">
          <span className="dp-empty-icon">↓</span>
          <p className="dp-empty-text">No hay descargas</p>
          <p className="dp-empty-sub">Las descargas aparecerán aquí</p>
        </div>
      ) : (
        <div className="dp-list">
          {sorted.map((dl) => {
            const pct = dl.totalBytes > 0
              ? Math.round((dl.downloadedBytes / dl.totalBytes) * 100)
              : dl.status === "completed" ? 100 : 0
            const isActive = dl.status === "downloading" || dl.status === "queued"

            return (
              <div key={dl.gameId} className={`dp-item dp-item--${dl.status}`}>
                <div className="dp-item-left">
                  <span className="dp-item-title">{dl.gameTitle}</span>
                  <div className="dp-item-meta">
                    <span className="dp-item-status" style={{ color: statusColor(dl.status) }}>
                      {statusLabel(dl)}
                    </span>
                    {dl.totalBytes > 0 && (
                      <span className="dp-item-bytes">
                        {formatBytes(dl.downloadedBytes)} / {formatBytes(dl.totalBytes)}
                      </span>
                    )}
                    {dl.totalFiles > 0 && (
                      <span className="dp-item-files">
                        {dl.completedFiles}/{dl.totalFiles} archivos
                      </span>
                    )}
                  </div>
                </div>

                <div className="dp-item-right">
                  <span className="dp-item-pct">{pct}%</span>
                  {isActive && (
                    <button
                      className="dp-cancel-btn"
                      onClick={() => cancelDownload(dl.gameId)}
                      title="Cancelar"
                    >
                      ✕ Cancelar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
