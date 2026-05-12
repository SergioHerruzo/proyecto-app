import "../styles/InstallConfirmModal.css"
import type { BuildPreview } from "../services/tauri"

interface InstallConfirmModalProps {
  gameTitle: string
  versionName: string
  preview: BuildPreview | null
  loading: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export default function InstallConfirmModal({
  gameTitle,
  versionName,
  preview,
  loading,
  error,
  onConfirm,
  onCancel,
}: InstallConfirmModalProps) {
  return (
    <div className="icm-backdrop" onClick={onCancel}>
      <div className="icm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="icm-header">
          <span className="icm-title">Instalar juego</span>
          <button className="icm-close" onClick={onCancel}>✕</button>
        </div>

        <div className="icm-body">
          <p className="icm-game-name">{gameTitle}</p>
          <p className="icm-version">Versión: <strong>{versionName}</strong></p>

          {loading && (
            <div className="icm-loading">
              <span className="icm-spinner" />
              Obteniendo información...
            </div>
          )}

          {error && (
            <p className="icm-error">{error}</p>
          )}

          {preview && !loading && (
            <div className="icm-info-grid">
              <div className="icm-info-item">
                <span className="icm-info-icon">📁</span>
                <div>
                  <span className="icm-info-label">Archivos</span>
                  <span className="icm-info-value">{preview.fileCount.toLocaleString("es-ES")}</span>
                </div>
              </div>
              <div className="icm-info-item">
                <span className="icm-info-icon">💾</span>
                <div>
                  <span className="icm-info-label">Tamaño total</span>
                  <span className="icm-info-value">{formatBytes(preview.totalBytes)}</span>
                </div>
              </div>
            </div>
          )}

          <p className="icm-hint">
            Los archivos se descargarán en el directorio de datos de la aplicación.
          </p>
        </div>

        <div className="icm-footer">
          <button className="icm-btn icm-btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="icm-btn icm-btn--confirm"
            onClick={onConfirm}
            disabled={loading || !!error}
          >
            ⬇ Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
