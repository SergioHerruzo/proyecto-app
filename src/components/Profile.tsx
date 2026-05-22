import '../styles/Profile.css'
import { useState, useEffect } from "react"
import { Trophy } from "lucide-react"
import type { AuthUser } from "../services/auth"
import {
  getCurrentUser,
  getUserLibrary,
  getGameAchievements,
  type BasicUserResponse,
  type AchievementResponse,
  type GameSummary,
} from "../services/api"
import EditProfileModal from "./EditProfileModal"

type RecentAchievement = AchievementResponse & { gameTitle: string }

interface Friend {
  id: number
  name: string
  status: "online" | "offline" | "playing"
  game?: string
}

const mockFriends: Friend[] = [
  { id: 1, name: "PlayerOne", status: "online" },
  { id: 2, name: "GamerX", status: "playing", game: "Cyber Adventure" },
  { id: 3, name: "NightOwl", status: "offline" },
  { id: 4, name: "PixelHero", status: "online" },
  { id: 5, name: "DarkBlade99", status: "playing", game: "Dark Dungeon" },
  { id: 6, name: "StarWatcher", status: "offline" },
  { id: 7, name: "IronFist", status: "online" },
]

const statusLabel: Record<Friend["status"], string> = {
  online: "En línea",
  offline: "Desconectado",
  playing: "Jugando",
}

const statusColor: Record<Friend["status"], string> = {
  online: "#4caf50",
  playing: "#2196f3",
  offline: "#555",
}

interface ProfileProps {
  authUser: AuthUser | null
  onNavigateToLibrary?: () => void
}

export default function Profile({ authUser, onNavigateToLibrary }: ProfileProps) {
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [addInput, setAddInput] = useState("")
  const [addError, setAddError] = useState("")
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [apiUser, setApiUser] = useState<BasicUserResponse | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [recentGames, setRecentGames] = useState<GameSummary[]>([])
  const [loadingGames, setLoadingGames] = useState(false)
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([])
  const [loadingAchievements, setLoadingAchievements] = useState(false)

  const loadRecentAchievements = async (userId: string) => {
    setLoadingAchievements(true)
    setLoadingGames(true)
    try {
      const library = await getUserLibrary()
      console.log('[Profile] library games:', library.length, library.map(g => g.id))
      setRecentGames(library.slice(0, 4))
      setLoadingGames(false)
      const toCheck = library.slice(0, 8)
      const results = await Promise.allSettled(
        toCheck.map(game =>
          getGameAchievements(game.id, userId).then(list => {
            console.log(`[Profile] achievements for ${game.title} (${game.id}):`, list)
            return list
              .filter(a => a.isUnlocked)
              .map(a => ({ ...a, gameTitle: game.title }))
          })
        )
      )
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Profile] achievement fetch failed for game[${i}]:`, r.reason)
      })
      const all: RecentAchievement[] = results
        .filter((r): r is PromiseFulfilledResult<RecentAchievement[]> => r.status === "fulfilled")
        .flatMap(r => r.value)

      console.log('[Profile] unlocked achievements total:', all.length)
      all.sort((a, b) => {
        const da = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0
        const db = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0
        return db - da
      })
      setRecentAchievements(all.slice(0, 5))
    } catch (err) {
      console.error('[Profile] loadRecentAchievements error:', err)
      setLoadingGames(false)
    } finally {
      setLoadingAchievements(false)
    }
  }

  useEffect(() => {
    if (!authUser) return
    getCurrentUser()
      .then(u => {
        setApiUser(u)
        setAvatarUrl(u.profilePicture?.mediumPictureUrl ?? null)
        loadRecentAchievements(u.userId)
      })
      .catch(err => console.error('[Profile] getCurrentUser error:', err))
  }, [authUser])

  const handleAddFriend = () => {
    const name = addInput.trim()
    if (!name) return
    if (friends.find(f => f.name.toLowerCase() === name.toLowerCase())) {
      setAddError("Ese usuario ya está en tu lista.")
      return
    }
    setFriends(prev => [...prev, { id: Date.now(), name, status: "offline" }])
    setAddInput("")
    setAddError("")
  }

  const handleRemoveFriend = (id: number) => {
    setFriends(prev => prev.filter(f => f.id !== id))
    setSelectedFriend(null)
  }

  return (
    <div className="profile-page">
      <div className="profile-main">
        <div className="profile-card">
          <div className="profile-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="profile-avatar-img" onError={() => setAvatarUrl(null)} />
              : null
            }
          </div>
          <div className="profile-info">
            <h1 className="profile-username">
              {apiUser?.displayName ?? authUser?.username ?? "Invitado"}
            </h1>
            {apiUser && apiUser.displayName !== authUser?.username && (
              <span className="profile-handle">@{authUser?.username}</span>
            )}
            {authUser && (
              <button className="profile-edit-btn" onClick={() => setEditOpen(true)}>
                Editar perfil
              </button>
            )}
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-header">
            <h2 className="profile-stat-title">ÚLTIMAS ADQUISICIONES</h2>
            {onNavigateToLibrary && (
              <button className="btn-ver-mas" onClick={onNavigateToLibrary}>Ver más →</button>
            )}
          </div>

          {loadingGames && <p className="profile-stat-hint">Cargando juegos...</p>}

          {!loadingGames && recentGames.length === 0 && (
            <p className="profile-stat-hint">Aún no tienes juegos en tu biblioteca.</p>
          )}

          {!loadingGames && recentGames.length > 0 && (
            <div className="profile-recent-games">
              {recentGames.map(g => {
                const capsule = g.artworks?.find(a => a.type === 'Capsule')
                const img = capsule?.mediumImageUrl ?? g.artworks?.[0]?.mediumImageUrl ?? ""
                return (
                  <div key={g.id} className="profile-recent-game">
                    <div
                      className="profile-recent-game-img"
                      style={img ? { backgroundImage: `url(${img})` } : undefined}
                    />
                    <span className="profile-recent-game-title">{g.title}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat-card">
            <div className="profile-stat-header">
              <h2 className="profile-stat-title">LOGROS RECIENTES</h2>
              {recentAchievements.length > 0 && (
                <span className="profile-achievements-count">{recentAchievements.length}</span>
              )}
            </div>

            {loadingAchievements && (
              <p className="profile-stat-hint">Cargando logros...</p>
            )}

            {!loadingAchievements && recentAchievements.length === 0 && (
              <div className="profile-achievements-empty">
                <Trophy size={32} className="profile-achievements-empty-icon" />
                <p className="profile-achievements-empty-text">Aún no has desbloqueado ningún logro</p>
              </div>
            )}

            {!loadingAchievements && recentAchievements.length > 0 && (
              <ul className="profile-achievements-list">
                {recentAchievements.map(a => (
                  <li key={a.id} className="achievement-item">
                    <Trophy size={22} className="achievement-icon" />
                    <div className="achievement-info">
                      <span className="achievement-title">{a.name}</span>
                      <span className="achievement-description">{a.description}</span>
                      <span className="achievement-game">
                        {a.gameTitle}
                        {a.unlockedAt && (
                          <> · {new Date(a.unlockedAt).toLocaleDateString("es-ES")}</>
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <aside className="profile-sidebar">
        <div className="friends-add">
          <p className="friends-add-label">Añadir amigo</p>
          <div className="friends-add-row">
            <input
              type="text"
              className="friends-add-input"
              placeholder="Nombre de usuario..."
              value={addInput}
              onChange={e => { setAddInput(e.target.value); setAddError("") }}
              onKeyDown={e => e.key === "Enter" && handleAddFriend()}
            />
            <button className="friends-add-btn" onClick={handleAddFriend}>+</button>
          </div>
          {addError && <p className="friends-add-error">{addError}</p>}
        </div>

        <div className="friends-header">
          <span className="friends-title">LISTA DE AMIGOS</span>
          <span className="friends-count">{friends.length}</span>
        </div>

        <ul className="friends-list">
          {friends.map(friend => (
            <li
              key={friend.id}
              className="friend-item"
              onClick={() => setSelectedFriend(friend)}
            >
              <div className={`friend-status-dot friend-status-dot--${friend.status}`} />
              <div className="friend-info">
                <span className="friend-name">{friend.name}</span>
                <span className="friend-status-text">
                  {friend.status === "playing" && friend.game
                    ? `Jugando a ${friend.game}`
                    : statusLabel[friend.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Modal amigo */}
      {selectedFriend && (
        <div className="friend-modal-overlay" onClick={() => setSelectedFriend(null)}>
          <div className="friend-modal" onClick={e => e.stopPropagation()}>
            <button className="friend-modal-close" onClick={() => setSelectedFriend(null)}>✕</button>
            <div className="friend-modal-avatar" />
            <h2 className="friend-modal-name">{selectedFriend.name}</h2>
            <div className="friend-modal-status">
              <div
                className="friend-status-dot"
                style={{ backgroundColor: statusColor[selectedFriend.status] }}
              />
              <span>
                {selectedFriend.status === "playing" && selectedFriend.game
                  ? `Jugando a ${selectedFriend.game}`
                  : statusLabel[selectedFriend.status]}
              </span>
            </div>
            <div className="friend-modal-divider" />
            <button className="friend-modal-remove" onClick={() => handleRemoveFriend(selectedFriend.id)}>
              Eliminar de la lista de amigos
            </button>
          </div>
        </div>
      )}

      {/* Modal editar perfil */}
      {editOpen && apiUser && (
        <EditProfileModal
          user={apiUser}
          onClose={() => setEditOpen(false)}
          onSaved={({ displayName, avatarUrl: newUrl }) => {
            setApiUser(prev => prev ? { ...prev, displayName } : prev)
            if (newUrl) setAvatarUrl(newUrl)
            setEditOpen(false)
          }}
        />
      )}

    </div>
  )
}
