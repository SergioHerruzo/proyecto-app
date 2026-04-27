import '../styles/Library.css'
import { useState, useRef } from "react"
import type { Collection } from "../types/games"

interface CollectionsViewProps {
  collections: Collection[]
  onSelectCollection: (collection: Collection) => void
  onCreateCollection: (name: string) => Promise<void>
  onDeleteCollection: (collectionId: string) => Promise<void>
  onAddGameToCollection: (collectionId: string, gameId: string) => Promise<void>
}

export default function CollectionsView({
  collections,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
  onAddGameToCollection,
}: CollectionsViewProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCreateClick = () => {
    setCreating(true)
    setNewName("")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleCreateSubmit = async () => {
    const trimmed = newName.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onCreateCollection(trimmed)
      setCreating(false)
      setNewName("")
    } catch (err) {
      console.error("[CollectionsView] createCollection failed:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreateSubmit()
    if (e.key === "Escape") { setCreating(false); setNewName("") }
  }

  const handleDrop = async (e: React.DragEvent, collectionId: string) => {
    e.preventDefault()
    setDragOverId(null)
    const gameId = e.dataTransfer.getData("gameId")
    if (!gameId) return
    try {
      await onAddGameToCollection(collectionId, gameId)
    } catch (err) {
      console.error("[CollectionsView] addGameToCollection failed:", err)
    }
  }

  return (
    <div className="collections-view">
      <div className="collections-grid">
        {/* Crear nueva colección */}
        {creating ? (
          <div className="collection-card collection-card--new collection-card--creating">
            <span className="collection-new-icon">+</span>
            <input
              ref={inputRef}
              className="collection-create-input"
              value={newName}
              onChange={e => setNewName(e.target.value.slice(0, 24))}
              onKeyDown={handleKeyDown}
              placeholder="Nombre (máx. 24)"
              maxLength={24}
            />
            <div className="collection-create-actions">
              <button
                className="collection-create-btn collection-create-btn--ok"
                onClick={handleCreateSubmit}
                disabled={!newName.trim() || saving}
              >
                {saving ? "..." : "Crear"}
              </button>
              <button
                className="collection-create-btn collection-create-btn--cancel"
                onClick={() => { setCreating(false); setNewName("") }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="collection-card collection-card--new" onClick={handleCreateClick}>
            <span className="collection-new-icon">+</span>
            <span className="collection-new-label">Crear nueva colección</span>
          </div>
        )}

        {collections.map(collection => (
          <div
            key={collection.id}
            className={`collection-card ${dragOverId === collection.id ? "collection-card--drag-over" : ""}`}
            onClick={() => onSelectCollection(collection)}
            onDragOver={e => { e.preventDefault(); setDragOverId(collection.id) }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={e => handleDrop(e, collection.id)}
          >
            <div className="collection-cover">
              {(collection.previewUrls ?? []).slice(0, 4).map((url, i) => (
                <div
                  key={i}
                  className="collection-cover-thumb"
                  style={url ? { backgroundImage: `url(${url})` } : undefined}
                />
              ))}
              {/* Fill empty slots if fewer than 4 previews */}
              {Array.from({ length: Math.max(0, 4 - (collection.previewUrls?.length ?? 0)) }).map((_, i) => (
                <div key={`empty-${i}`} className="collection-cover-thumb" />
              ))}
            </div>

            <div className="collection-footer">
              <span className="collection-name">{collection.name}</span>
              <button
                className="collection-delete-btn"
                title="Eliminar colección"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteCollection(collection.id)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
