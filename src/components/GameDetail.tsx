import '../styles/GameDetail.css'
import { useState } from "react"
import type { Game } from "../types/games"
import ReportModal from "./ReportModal"

interface GameDetailProps {
  game: Game
  allGames: Game[]
  cartItems: Game[]
  onAddToCart: (game: Game) => void
  onBack: () => void
  onSelectGame: (game: Game) => void
}

const slideColors = ["1a2535", "2a1a35", "1a3525", "35251a", "251a35"]

function getScreenshots(game: Game): string[] {
  if (game.screenshots && game.screenshots.length > 0) return game.screenshots
  return Array.from({ length: 5 }, (_, i) =>
    `https://placehold.co/800x450/${slideColors[i]}/666?text=${encodeURIComponent(game.title)}`
  )
}

const mockFriendsWithGame = ["PlayerOne", "GamerX"]

export default function GameDetail({ game, allGames, cartItems, onAddToCart, onBack, onSelectGame }: GameDetailProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)

  const screenshots = getScreenshots(game)
  const inCart = cartItems.some(g => g.id === game.id)
  const discount = game.oldPrice && game.price !== undefined ? Math.round((1 - game.price / game.oldPrice) * 100) : null
  const similarGames = allGames
    .filter(g => g.id !== game.id && g.genres.some(genre => game.genres.includes(genre)))
    .slice(0, 4)

  const tags = game.tags ?? game.genres

  return (
    <div className="game-detail-wrapper">
      <div className="game-detail-container">

        {/* Breadcrumb */}
        <div className="game-detail-breadcrumb">
          <button className="breadcrumb-btn" onClick={onBack}>Todos los juegos</button>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item">{game.genres[0]}</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-item breadcrumb-item--current">{game.title}</span>
        </div>

        <h1 className="game-detail-title">{game.title}</h1>

        <div className="game-detail-body">

          {/* LEFT COLUMN */}
          <div className="game-detail-left">

            {/* Media carousel */}
            <div className="detail-carousel">
              <button
                className="detail-carousel-arrow"
                onClick={() => setCurrentSlide(i => Math.max(0, i - 1))}
                disabled={currentSlide === 0}
              >‹</button>

              <div
                className="detail-carousel-main"
                style={{ backgroundImage: `url(${screenshots[currentSlide]})` }}
              />

              <button
                className="detail-carousel-arrow"
                onClick={() => setCurrentSlide(i => Math.min(screenshots.length - 1, i + 1))}
                disabled={currentSlide === screenshots.length - 1}
              >›</button>
            </div>

            {/* Thumbnails */}
            <div className="detail-thumbnails">
              {screenshots.map((src, i) => (
                <button
                  key={i}
                  className={`detail-thumb ${i === currentSlide ? "detail-thumb--active" : ""}`}
                  onClick={() => setCurrentSlide(i)}
                  style={{ backgroundImage: `url(${src})` }}
                />
              ))}
            </div>

            {/* Purchase */}
            <div className="detail-purchase">
              <div className="detail-purchase-row">
                <span className="detail-purchase-name">Comprar {game.title}</span>
                {discount && game.price !== undefined && (
                  <div className="detail-purchase-price-group">
                    <span className="detail-discount-badge">-{discount}%</span>
                    <div className="detail-purchase-prices">
                      {game.oldPrice && <span className="price-old">{game.oldPrice.toFixed(2)}€</span>}
                      <span className="detail-new-price">{game.price.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
                {!discount && game.price !== undefined && (
                  <span className="detail-new-price">{game.price.toFixed(2)}€</span>
                )}
                <button
                  className={`detail-buy-btn ${inCart ? "detail-buy-btn--in-cart" : ""}`}
                  onClick={() => { if (!inCart) onAddToCart(game) }}
                >
                  {inCart ? "En el carrito" : "Añadir al carro"}
                </button>
              </div>
            </div>

            {/* Friends who have it */}
            <div className="detail-friends">
              <h3 className="detail-section-label">Amigos que tienen este juego</h3>
              <div className="detail-friends-list">
                {mockFriendsWithGame.map(name => (
                  <div key={name} className="detail-friend-item">
                    <div className="detail-friend-avatar" />
                    <span className="detail-friend-name">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="game-detail-right">
            <div
              className="detail-cover"
              style={{ backgroundImage: `url(${game.image})` }}
            />

            {game.description && (
              <p className="detail-description">{game.description}</p>
            )}

            <div className="detail-meta">
              <div className="detail-meta-row">
                <span className="detail-meta-label">RESEÑAS RECIENTES:</span>
                <span className="detail-meta-positive">Muy positivas (307)</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">TODAS LAS RESEÑAS:</span>
                <span className="detail-meta-positive">Muy positivas (7.072)</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">FECHA DE LANZAMIENTO:</span>
                <span className="detail-meta-value">{game.releaseDate ?? "21 OCT 2025"}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">DESARROLLADOR:</span>
                <span className="detail-meta-link">{game.developer ?? "Indie Studio"}</span>
              </div>
            </div>

            <div className="detail-tags">
              {tags.map(tag => (
                <span key={tag} className="detail-tag">{tag}</span>
              ))}
            </div>

            <button className="detail-report-btn" onClick={() => setReportOpen(true)}>
              Denunciar este juego
            </button>
          </div>
        </div>

        {/* Similar games */}
        {similarGames.length > 0 && (
          <div className="detail-similar">
            <h3 className="detail-section-label">Puede que este juego te interese</h3>
            <div className="detail-similar-grid">
              {similarGames.map(g => (
                <div key={g.id} className="detail-similar-card" onClick={() => onSelectGame(g)}>
                  <div
                    className="detail-similar-image"
                    style={{ backgroundImage: `url(${g.image})` }}
                  />
                  <div className="detail-similar-info">
                    <span className="detail-similar-title">{g.title}</span>
                    <span className="detail-similar-genres">{g.genres.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {reportOpen && (
        <ReportModal
          gameName={game.title}
          onClose={() => setReportOpen(false)}
          onSubmit={(reason, description) => {
            console.log('[Report]', { gameId: game.id, reason, description })
          }}
        />
      )}
    </div>
  )
}
