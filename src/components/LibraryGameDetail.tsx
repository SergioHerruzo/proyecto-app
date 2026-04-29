import '../styles/LibraryGameDetail.css'
import { useState, useEffect } from "react"
import type { Game } from "../types/games"
import { getGameAchievements, unlockAchievement, type AchievementResponse } from "../services/api"

interface LibraryGameDetailProps {
  game: Game
}

type Tab = "logros" | "amigos" | "info"

const tabs: { id: Tab; label: string }[] = [
  { id: "info",   label: "Información" },
  { id: "logros", label: "Logros" },
  { id: "amigos", label: "Amigos" },
]

export default function LibraryGameDetail({ game }: LibraryGameDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("info")
  const [achievements, setAchievements] = useState<AchievementResponse[]>([])
  const [loadingAchievements, setLoadingAchievements] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab !== "logros" || achievements.length > 0) return
    setLoadingAchievements(true)
    getGameAchievements(game.id)
      .then(res => setAchievements(res.items))
      .catch(console.error)
      .finally(() => setLoadingAchievements(false))
  }, [activeTab, game.id])

  async function handleUnlock(achievementId: string) {
    setUnlockingId(achievementId)
    try {
      await unlockAchievement(achievementId)
      setUnlockedIds(prev => new Set(prev).add(achievementId))
    } catch (e) {
      console.error(e)
    } finally {
      setUnlockingId(null)
    }
  }

  return (
    <div className="lgd-wrapper">

      {/* Hero */}
      <div className="lgd-hero" style={{ backgroundImage: `url(${game.image})` }}>
        <div className="lgd-hero-overlay">
          <h1 className="lgd-hero-title">{game.title}</h1>
        </div>
      </div>

      {/* Action bar */}
      <div className="lgd-actionbar">
        <button className="lgd-main-btn lgd-main-btn--play">▶ JUGAR</button>

        <div className="lgd-stats">
          <div className="lgd-stat">
            <span className="lgd-stat-label">ÚLTIMA SESIÓN</span>
            <span className="lgd-stat-value">—</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">TIEMPO DE JUEGO</span>
            <span className="lgd-stat-value">0 horas</span>
          </div>
          <div className="lgd-stat">
            <span className="lgd-stat-label">LOGROS</span>
            <span className="lgd-stat-value">
              {achievements.length > 0
              ? `${achievements.filter(a => a.isUnlocked || unlockedIds.has(a.id)).length} / ${achievements.length}`
              : "—"}
            </span>
          </div>
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
        {activeTab === "logros" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">
              LOGROS {achievements.length > 0 && `· ${unlockedIds.size} / ${achievements.length}`}
            </span>

            {loadingAchievements && (
              <div className="lgd-empty-state">
                <p className="lgd-empty-title">Cargando logros...</p>
              </div>
            )}

            {!loadingAchievements && achievements.length === 0 && (
              <div className="lgd-empty-state">
                <span className="lgd-empty-icon">🏆</span>
                <p className="lgd-empty-title">Sin logros</p>
                <p className="lgd-empty-sub">Este juego no tiene logros disponibles</p>
              </div>
            )}

            {!loadingAchievements && achievements.length > 0 && (
              <div className="lgd-achievement-list">
                {achievements.map(a => {
                  const unlocked = a.isUnlocked || unlockedIds.has(a.id)
                  return (
                    <div key={a.id} className={`lgd-achievement${unlocked ? " lgd-achievement--unlocked" : ""}`}>
                      <div className="lgd-achievement-icon">{unlocked ? "🏆" : "🔒"}</div>
                      <div className="lgd-achievement-info">
                        <span className="lgd-achievement-name">{a.name}</span>
                        <span className="lgd-achievement-desc">{a.description}</span>
                      </div>
                      {!unlocked && (
                        <button
                          className="lgd-achievement-btn"
                          disabled={unlockingId === a.id}
                          onClick={() => handleUnlock(a.id)}
                        >
                          {unlockingId === a.id ? "..." : "Desbloquear"}
                        </button>
                      )}
                      {unlocked && <span className="lgd-achievement-done">✓ Desbloqueado</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "amigos" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">AMIGOS QUE JUEGAN A ESTE JUEGO</span>
            <div className="lgd-empty-state">
              <span className="lgd-empty-icon">👥</span>
              <p className="lgd-empty-title">Próximamente</p>
              <p className="lgd-empty-sub">Aquí verás qué amigos juegan a este juego</p>
            </div>
          </div>
        )}

        {activeTab === "info" && (
          <div className="lgd-section-card">
            <span className="lgd-section-label">INFORMACIÓN DEL JUEGO</span>
            <div className="lgd-info-grid">
              {game.developer && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Desarrollador</span>
                  <span className="lgd-info-val">{game.developer}</span>
                </div>
              )}
              {game.genres?.length > 0 && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Géneros</span>
                  <span className="lgd-info-val">{game.genres.join(", ")}</span>
                </div>
              )}
              {game.releaseDate && (
                <div className="lgd-info-row">
                  <span className="lgd-info-key">Fecha de lanzamiento</span>
                  <span className="lgd-info-val">{game.releaseDate}</span>
                </div>
              )}
              {game.description && (
                <div className="lgd-info-row lgd-info-row--block">
                  <span className="lgd-info-key">Descripción</span>
                  <span className="lgd-info-val lgd-info-desc">{game.description}</span>
                </div>
              )}
              {!game.developer && !game.releaseDate && !game.description && (
                <div className="lgd-empty-state">
                  <span className="lgd-empty-icon">ℹ️</span>
                  <p className="lgd-empty-title">Sin información disponible</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
