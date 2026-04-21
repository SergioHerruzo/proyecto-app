import '../styles/LibraryGameDetail.css'
import { useState } from "react"
import type { Game } from "../types/games"

interface LibraryGameDetailProps {
  game: Game
}

const mockUnlocked = [
  { id: 1, icon: "🏆", title: "Primera sangre", description: "Derrota a tu primer enemigo." },
  { id: 2, icon: "🗺️", title: "Explorador", description: "Descubre todos los mapas del mundo." },
  { id: 3, icon: "🛡️", title: "Sin rasguños", description: "Completa un nivel sin recibir daño." },
]

const mockLocked = [
  { id: 4 }, { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 },
]

const mockDLC = [
  { id: 1, title: "Lost Colony", image: "https://placehold.co/200x120/1a2a1a/555" },
  { id: 2, title: "Dragon Pack", image: "https://placehold.co/200x120/2a1a1a/555" },
  { id: 3, title: "Space Edition", image: "https://placehold.co/200x120/1a1a2a/555" },
  { id: 4, title: "Neon Bundle", image: "https://placehold.co/200x120/2a2a1a/555" },
]

const mockFriends = ["PlayerOne", "GamerX"]

export default function LibraryGameDetail({ game }: LibraryGameDetailProps) {
  const [installed, setInstalled] = useState(false)
  const [activeTab, setActiveTab] = useState("tienda")

  const unlocked = mockUnlocked.length
  const total = unlocked + mockLocked.length
  const pct = Math.round((unlocked / total) * 100)

  const tabs = [
    { id: "tienda", label: "Página de la tienda" },
    { id: "dlc", label: "DLC" },
    { id: "encuentro", label: "Punto de encuentro" },
    { id: "discusiones", label: "Discusiones" },
    { id: "guias", label: "Guías" },
    { id: "soporte", label: "Soporte" },
  ]

  return (
    <div className="lgd-wrapper">

      {/* Hero banner */}
      <div className="lgd-hero" style={{ backgroundImage: `url(${game.image})` }}>
        <div className="lgd-hero-overlay">
          <h1 className="lgd-hero-title">{game.title}</h1>
        </div>
      </div>

      {/* Action bar */}
      <div className="lgd-actionbar">
        <button
          className={`lgd-main-btn ${installed ? "lgd-main-btn--play" : "lgd-main-btn--install"}`}
          onClick={() => setInstalled(v => !v)}
        >
          {installed ? "▶ JUGAR" : "↓ INSTALAR"}
        </button>

        <div className="lgd-stats">
          <div className="lgd-stat">
            <span className="lgd-stat-label">ÚLTIMA SESIÓN</span>
            <span className="lgd-stat-value">2 nov 2023</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">TIEMPO DE JUEGO</span>
            <span className="lgd-stat-value">32,9 horas</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">LOGROS</span>
            <div className="lgd-achievements-stat">
              <span className="lgd-stat-value">{unlocked}/{total}</span>
              <div className="lgd-achievements-minibar">
                <div className="lgd-achievements-minifill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="lgd-icon-btns">
          <button className="lgd-icon-btn" title="Configuración">⚙</button>
          <button className="lgd-icon-btn" title="Información">ⓘ</button>
          <button className="lgd-icon-btn" title="Deseados">♥</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="lgd-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`lgd-tab ${activeTab === tab.id ? "lgd-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="lgd-content">

        {/* LEFT */}
        <div className="lgd-left">

          {/* Featured news */}
          <div className="lgd-featured">
            <div className="lgd-featured-badge">DESTACADO</div>
            <div className="lgd-featured-body">
              <div className="lgd-featured-img" style={{ backgroundImage: `url(${game.image})` }} />
              <div className="lgd-featured-text">
                <p className="lgd-featured-type">ACTUALIZACIÓN IMPORTANTE · 25 DE FEBRERO</p>
                <h3 className="lgd-featured-title">Mega Update is now live!</h3>
                <p className="lgd-featured-desc">
                  Explora nuevas zonas, enfréntate a enemigos inéditos y descubre secretos ocultos en la mayor actualización hasta la fecha del juego.
                </p>
              </div>
            </div>
          </div>

          {/* DLC */}
          <div className="lgd-dlc">
            <div className="lgd-dlc-header">
              <span className="lgd-dlc-title">CONTENIDO DISPONIBLE</span>
              <div className="lgd-dlc-arrows">
                <button className="lgd-dlc-arrow">‹</button>
                <button className="lgd-dlc-arrow">›</button>
              </div>
            </div>
            <div className="lgd-dlc-grid">
              {mockDLC.map(dlc => (
                <div key={dlc.id} className="lgd-dlc-item">
                  <div className="lgd-dlc-img" style={{ backgroundImage: `url(${dlc.image})` }}>
                    <span className="lgd-dlc-download-icon">↓</span>
                  </div>
                  <span className="lgd-dlc-name">{dlc.title}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT */}
        <div className="lgd-right">

          {/* Friends */}
          <div className="lgd-section">
            <h3 className="lgd-section-title">AMIGOS QUE JUEGAN A ESTE JUEGO</h3>
            <p className="lgd-section-sub">{mockFriends.length} amigos jugaron anteriormente</p>
            <div className="lgd-friend-avatars">
              {mockFriends.map(name => (
                <div key={name} className="lgd-friend-avatar" title={name} />
              ))}
            </div>
            <button className="lgd-link-btn">Ver todos los amigos que juegan a este juego</button>
          </div>

          {/* Achievements */}
          <div className="lgd-section">
            <h3 className="lgd-section-title">LOGROS</h3>
            <p className="lgd-section-sub">Has desbloqueado {unlocked}/{total} ({pct}%)</p>

            <div className="lgd-achievements-bar">
              <div className="lgd-achievements-fill" style={{ width: `${pct}%` }} />
            </div>

            {/* First unlocked */}
            <div className="lgd-achievement-item">
              <div className="lgd-achievement-icon">{mockUnlocked[0].icon}</div>
              <div className="lgd-achievement-info">
                <span className="lgd-achievement-title">{mockUnlocked[0].title}</span>
                <span className="lgd-achievement-desc">{mockUnlocked[0].description}</span>
              </div>
            </div>

            {/* Unlocked badges */}
            <div className="lgd-badge-row">
              {mockUnlocked.map(a => (
                <div key={a.id} className="lgd-badge lgd-badge--unlocked">{a.icon}</div>
              ))}
            </div>

            <p className="lgd-section-sub" style={{ marginTop: 12 }}>Logros bloqueados</p>
            <div className="lgd-badge-row">
              {mockLocked.map(a => (
                <div key={a.id} className="lgd-badge lgd-badge--locked">🔒</div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
