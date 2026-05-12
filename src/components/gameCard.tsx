import '../styles/GameCard.css'
import type { Game } from "../types/games"

interface GameCardProps {
  game: Game
  variant?: "discount" | "recommended"
  isOwned?: boolean
  onAddToCart?: (game: Game) => void
  onSelectGame?: (game: Game) => void
}

export default function GameCard({ game, variant = "recommended", isOwned = false, onAddToCart, onSelectGame }: GameCardProps) {
  return (
    <div className={`game-card game-card--${variant}`} onClick={() => onSelectGame?.(game)}>
      <div className="game-card-image">
        <div className="game-card-image-bg" style={{ backgroundImage: `url(${game.image})` }} />
        {!isOwned && (
          <button className="cart-btn" title="Agregar al carrito" onClick={e => { e.stopPropagation(); onAddToCart?.(game) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </button>
        )}
        {isOwned && (
          <div className="cart-btn cart-btn--owned" onClick={e => e.stopPropagation()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="owned-label">Ya lo tienes</span>
          </div>
        )}
      </div>

      <div className="game-card-info">
        <h3 className="game-card-title">{game.title}</h3>
        <p className="game-card-genres">{game.genres.join(", ")}</p>

        {game.price !== undefined && (
          <div className="game-card-prices">
            {game.oldPrice && (
              <span className="price-old">{game.oldPrice.toFixed(2)}€</span>
            )}
            <span className="price-current">{game.price.toFixed(2)}€</span>
          </div>
        )}
      </div>
    </div>
  )
}
