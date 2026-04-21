import '../styles/HeroGame.css'
import type { Game } from "../types/games"

interface HeroGameProps {
  game: Game
}

export default function HeroGame({ game }: HeroGameProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">{game.title}</h1>
          {game.description && (
            <p className="hero-description">{game.description}</p>
          )}
          <div className="hero-buttons">
            <button className="btn-outline">
              {game.price !== undefined ? `Comprar - ${game.price.toFixed(2)}€` : "Comprar"}
            </button>
            <button className="btn-ghost">
              Agregar a deseados
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
