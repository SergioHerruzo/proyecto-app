import '../styles/GameSection.css'
import { useState } from "react"
import GameCard from "./gameCard"
import type { Game } from "../types/games"

interface GameSectionProps {
  title: string
  games: Game[]
  variant?: "discount" | "recommended"
  ownedGameIds?: Set<string>
  onAddToCart?: (game: Game) => void
  onSelectGame?: (game: Game) => void
}

export default function GameSection({ title, games, variant = "recommended", ownedGameIds, onAddToCart, onSelectGame }: GameSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const visibleCount = 4

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1))
  const next = () => setCurrentIndex(i => Math.min(games.length - visibleCount, i + 1))

  if (variant === "discount") {
    return (
      <section className="game-section">
        <h2 className="section-title">{title}</h2>

        <div className="carousel-wrapper">
          <button
            className="carousel-btn carousel-btn--prev"
            onClick={prev}
            disabled={currentIndex === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="carousel-track-container">
            <div
              className="carousel-track"
              style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
            >
              {games.map((game) => (
                <div className="carousel-item" key={game.id}>
                  <GameCard game={game} variant="discount" isOwned={ownedGameIds?.has(game.id) ?? false} onAddToCart={onAddToCart} onSelectGame={onSelectGame} />
                </div>
              ))}
            </div>
          </div>

          <button
            className="carousel-btn carousel-btn--next"
            onClick={next}
            disabled={currentIndex >= games.length - visibleCount}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="game-section">
      <h2 className="section-title">{title}</h2>
      <div className="games-grid">
        {games.map((game) => (
          <GameCard key={game.id} game={game} variant="recommended" isOwned={ownedGameIds?.has(game.id) ?? false} onAddToCart={onAddToCart} onSelectGame={onSelectGame} />
        ))}
      </div>
    </section>
  )
}
