import type { Collection } from "../types/games"

interface CollectionsViewProps {
  collections: Collection[]
  onSelectCollection: (collection: Collection) => void
}

export default function CollectionsView({ collections, onSelectCollection }: CollectionsViewProps) {
  return (
    <div className="collections-view">
      <div className="collections-grid">
        <div className="collection-card collection-card--new">
          <span className="collection-new-icon">+</span>
          <span className="collection-new-label">Crear nueva colección</span>
        </div>

        {collections.map(collection => (
          <div
            key={collection.id}
            className="collection-card"
            onClick={() => onSelectCollection(collection)}
          >
            <div className="collection-cover">
              {collection.games.slice(0, 4).map((game, i) => (
                <div
                  key={i}
                  className="collection-cover-thumb"
                  style={{ backgroundImage: `url(${game.image})` }}
                />
              ))}
            </div>
            <span className="collection-name">{collection.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
