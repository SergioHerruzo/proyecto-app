import '../styles/ReportModal.css'
import { useState } from 'react'

const REASONS = [
  'Contenido inapropiado',
  'Spam o publicidad engañosa',
  'Juego falso o fraudulento',
  'Violación de derechos de autor',
  'Información incorrecta',
  'Otro',
]

interface ReportModalProps {
  gameName: string
  onClose: () => void
  onSubmit: (reason: string, description: string) => void
}

export default function ReportModal({ gameName, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [description, setDescription] = useState('')

  function handleClose() {
    setSelectedReason(null)
    setCustomReason('')
    setDescription('')
    onClose()
  }

  function handleSubmit() {
    const reason = selectedReason === 'Otro' ? customReason.trim() : selectedReason
    if (!reason) return
    onSubmit(reason, description.trim())
    handleClose()
  }

  const finalReason = selectedReason === 'Otro' ? customReason.trim() : selectedReason
  const canSubmit = !!finalReason

  return (
    <div className="report-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>

        <div className="report-header">
          <div>
            <h2 className="report-title">Denunciar juego</h2>
            <p className="report-subtitle">{gameName}</p>
          </div>
          <button className="report-close" onClick={handleClose}>✕</button>
        </div>

        <div className="report-body">
          <span className="report-section-label">Motivo</span>
          <div className="report-reasons">
            {REASONS.map(reason => (
              <button
                key={reason}
                className={`report-reason-btn${selectedReason === reason ? ' report-reason-btn--active' : ''}`}
                onClick={() => setSelectedReason(reason)}
              >
                <span className={`report-radio${selectedReason === reason ? ' report-radio--active' : ''}`} />
                {reason}
              </button>
            ))}
          </div>

          {selectedReason === 'Otro' && (
            <input
              className="report-input"
              placeholder="Especifica el motivo..."
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              maxLength={120}
            />
          )}

          <span className="report-section-label">
            Descripción <span className="report-optional">(opcional)</span>
          </span>
          <textarea
            className="report-input report-textarea"
            placeholder="Describe el problema con más detalle..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={4}
          />
        </div>

        <button
          className={`report-submit${!canSubmit ? ' report-submit--disabled' : ''}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          Enviar denuncia
        </button>
      </div>
    </div>
  )
}
