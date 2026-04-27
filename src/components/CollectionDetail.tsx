import '../styles/Library.css'
import { useState } from "react"
import type { Collection, Game } from "../types/games"

interface CollectionDetailProps {
  collection: Collection
  onBack: () => void
  onSelectGame?: (game: Game) => void
  onAddGame?: (gameId: string) => Promise<void>
  onRemoveGame?: (gameId: string) => Promise<void>
}

export default function CollectionDetail({ collection, onBack, onSelectGame, onAddGame, onRemoveGame }: CollectionDetailProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const gameId = e.dataTransfer.getData("gameId")
    if (!gameId || !onAddGame) return
    try {
      await onAddGame(gameId)
    } catch (err) {
      console.error("[CollectionDetail] addGame failed:", err)
    }
  }

  const handleRemove = async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation()
    if (!onRemoveGame || removingId) return
    setRemovingId(gameId)
    try {
      await onRemoveGame(gameId)
    } catch (err) {
      console.error("[CollectionDetail] removeGame failed:", err)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="collection-detail">
      <div className="collection-detail-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>
        <h2 className="collection-detail-title">{collection.name}</h2>
        <span className="collection-detail-count">{collection.games.length} juego{collection.games.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Drop zone */}
      <div
        className={`collection-drop-zone ${isDragOver ? "collection-drop-zone--active" : ""}`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <span className="collection-drop-zone-label">
          {isDragOver ? "Suelta para añadir a la colección" : "Arrastra juegos aquí para añadirlos"}
        </span>
      </div>

      {collection.games.length === 0 ? (
        <div className="collection-empty">
          <p>Esta colección está vacía</p>
          <p>Arrastra juegos desde la barra lateral para añadirlos</p>
        </div>
      ) : (
        <div className="covers-grid">
          {collection.games.map(game => (
            <div
              key={game.id}
              className="game-cover-card"
              onClick={() => onSelectGame?.(game)}
            >
              <div className="game-cover-image-wrapper">
                <div
                  className="game-cover-image"
                  style={{ backgroundImage: `url(${game.image})` }}
                />
                <button
                  className={`game-cover-remove-btn ${removingId === game.id ? "game-cover-remove-btn--loading" : ""}`}
                  title="Quitar de la colección"
                  onClick={e => handleRemove(e, game.id)}
                >
                  {removingId === game.id ? "..." : "✕"}
                </button>
              </div>
              <p className="game-cover-title">{game.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
