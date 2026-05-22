import '../styles/HeroGame.css'
import type { Game } from "../types/games"

interface HeroGameProps {
  game: Game
  ownedGameIds?: Set<string>
  onAddToCart?: (game: Game) => void
  onSelectGame?: (game: Game) => void
  onViewInLibrary?: () => void
}

export default function HeroGame({ game, ownedGameIds, onAddToCart, onSelectGame, onViewInLibrary }: HeroGameProps) {
  const isOwned = ownedGameIds?.has(game.id) ?? false
  const showLibraryBtn = isOwned && !!onViewInLibrary

  return (
    <section className="hero" style={{ cursor: "pointer" }} onClick={() => onSelectGame?.(game)}>
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">{game.title}</h1>
          {game.description && (
            <p className="hero-description">{game.description}</p>
          )}
          <div className="hero-buttons">
            <button
              className={showLibraryBtn ? "btn-library" : "btn-primary"}
              disabled={isOwned && !showLibraryBtn}
              onClick={e => {
                e.stopPropagation()
                if (showLibraryBtn) onViewInLibrary()
                else if (!isOwned) onAddToCart?.(game)
              }}
            >
              {showLibraryBtn ? "Ver en la biblioteca" : isOwned ? "Ya en tu biblioteca" : game.price !== undefined ? `Comprar - ${game.price.toFixed(2)}€` : "Comprar"}
            </button>
          </div>
        </div>

        <div
          className="hero-image"
          style={{ backgroundImage: `url(${game.headerImage ?? game.image})` }}
        />
      </div>
    </section>
  )
}
