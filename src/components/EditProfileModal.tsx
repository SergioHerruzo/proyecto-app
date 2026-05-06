import '../styles/EditProfileModal.css'
import { useState, useRef } from 'react'
import { updateDisplayName, updateProfilePicture, getCurrentUser } from '../services/api'
import type { BasicUserResponse } from '../services/api'

interface EditProfileModalProps {
  user: BasicUserResponse
  onClose: () => void
  onSaved: (updated: { displayName: string; avatarUrl: string | null }) => void
}

export default function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.profilePicture?.mediumPictureUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nameError = displayName.trim().length > 0 && (displayName.trim().length < 3 || displayName.trim().length > 24)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    const name = displayName.trim()
    if (name.length < 3 || name.length > 24) {
      setError('El nombre debe tener entre 3 y 24 caracteres.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updateDisplayName(name)
      if (imageFile) await updateProfilePicture(imageFile)
      // Re-fetch to get the real S3 URL instead of the blob: preview URL
      const fresh = await getCurrentUser()
      onSaved({
        displayName: fresh.displayName,
        avatarUrl: fresh.profilePicture?.mediumPictureUrl ?? null,
      })
    } catch (err) {
      console.error('[EditProfile] save error:', err)
      setError('No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" onClick={e => e.stopPropagation()}>

        <div className="ep-header">
          <h2 className="ep-title">Editar perfil</h2>
          <button className="ep-close" onClick={onClose}>✕</button>
        </div>

        {/* Avatar */}
        <div className="ep-avatar-section">
          <div className="ep-avatar-wrap">
            {previewUrl
              ? <img src={previewUrl} alt="avatar" className="ep-avatar-img" />
              : <div className="ep-avatar-placeholder" />
            }
            <button className="ep-avatar-overlay" onClick={() => fileInputRef.current?.click()}>
              Cambiar foto
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <p className="ep-avatar-hint">JPG, PNG o WEBP · Máx. 5 MB</p>
        </div>

        {/* Display name */}
        <div className="ep-field">
          <label className="ep-label">
            Nombre de perfil
            <span className={`ep-char-count${nameError ? ' ep-char-count--error' : ''}`}>
              {displayName.trim().length}/24
            </span>
          </label>
          <input
            className={`ep-input${nameError ? ' ep-input--error' : ''}`}
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setError(null) }}
            maxLength={24}
            placeholder="Tu nombre de perfil"
          />
          {nameError && (
            <span className="ep-field-error">Mínimo 3 caracteres, máximo 24.</span>
          )}
        </div>

        {error && <p className="ep-error">{error}</p>}

        <div className="ep-actions">
          <button className="ep-cancel" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className="ep-save"
            onClick={handleSubmit}
            disabled={loading || nameError || displayName.trim().length < 3}
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
