import '../styles/HeroGame.css'
import type { Game } from "../types/games"

interface HeroGameProps {
  game: Game
  onAddToCart?: (game: Game) => void
  onSelectGame?: (game: Game) => void
}

export default function HeroGame({ game, onAddToCart, onSelectGame }: HeroGameProps) {
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
              className="btn-primary"
              onClick={e => { e.stopPropagation(); onAddToCart?.(game) }}
            >
              {game.price !== undefined ? `Comprar - ${game.price.toFixed(2)}€` : "Comprar"}
            </button>
          </div>
        </div>

        <div
          className="hero-image"
          style={{ backgroundImage: `url(${game.image})` }}
        />
      </div>
    </section>
  )
}
