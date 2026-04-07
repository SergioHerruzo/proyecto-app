import type { Collection, Game } from "../types/games"

interface CollectionDetailProps {
  collection: Collection
  onBack: () => void
  onSelectGame?: (game: Game) => void
}

export default function CollectionDetail({ collection, onBack, onSelectGame }: CollectionDetailProps) {
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
        <span className="collection-detail-count">{collection.games.length} juegos</span>
      </div>

      <div className="covers-grid">
        {collection.games.map(game => (
          <div key={game.id} className="game-cover-card" onClick={() => onSelectGame?.(game)}>
            <div
              className="game-cover-image"
              style={{ backgroundImage: `url(${game.image})` }}
            />
            <p className="game-cover-title">{game.title}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
