import { useState } from "react"
import type { AuthUser } from "../services/auth"

interface Friend {
  id: number
  name: string
  status: "online" | "offline" | "playing"
  game?: string
}

interface Achievement {
  id: number
  title: string
  description: string
  game: string
  date: string
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

const mockAchievements: Achievement[] = [
  { id: 1, title: "Primera sangre", description: "Derrota a tu primer enemigo.", game: "Cyber Adventure", date: "hace 2 días" },
  { id: 2, title: "Sin rasguños", description: "Completa un nivel sin recibir daño.", game: "Dark Dungeon", date: "hace 3 días" },
  { id: 3, title: "Explorador", description: "Descubre todos los mapas del mundo.", game: "Fantasy World", date: "hace 5 días" },
  { id: 4, title: "Coleccionista", description: "Recoge 50 objetos distintos.", game: "Pixel Quest", date: "hace 1 semana" },
  { id: 5, title: "Superviviente", description: "Sobrevive 10 noches seguidas.", game: "Space Survival", date: "hace 1 semana" },
  { id: 6, title: "Maestro del combate", description: "Encadena 20 golpes sin fallar.", game: "Shadow Blade", date: "hace 2 semanas" },
  { id: 7, title: "Velocista", description: "Completa una carrera en menos de 2 minutos.", game: "Storm Riders", date: "hace 2 semanas" },
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
}

export default function Profile({ authUser }: ProfileProps) {
  const [friends, setFriends] = useState<Friend[]>(mockFriends)
  const [addInput, setAddInput] = useState("")
  const [addError, setAddError] = useState("")
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [showAchievements, setShowAchievements] = useState(false)

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
          <div className="profile-avatar" />
          <div className="profile-info">
            <h1 className="profile-username">{authUser?.username ?? "Invitado"}</h1>
            <span className="profile-level">NIVEL 46</span>
          </div>
        </div>

        <div className="profile-stats">
          <div className="profile-stat-card">
            <h2 className="profile-stat-title">HORAS JUGADAS</h2>
            <div className="profile-stat-content" />
          </div>
          <div className="profile-stat-card">
            <div className="profile-stat-header">
              <h2 className="profile-stat-title">LOGROS</h2>
              <button className="btn-ver-mas" onClick={() => setShowAchievements(true)}>
                Ver más
              </button>
            </div>
            <div className="profile-stat-content" />
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

      {/* Modal logros */}
      {showAchievements && (
        <div className="friend-modal-overlay" onClick={() => setShowAchievements(false)}>
          <div className="achievements-modal" onClick={e => e.stopPropagation()}>
            <div className="achievements-modal-header">
              <h2 className="achievements-modal-title">Logros recientes</h2>
              <button className="friend-modal-close" onClick={() => setShowAchievements(false)}>✕</button>
            </div>

            <ul className="achievements-list">
              {mockAchievements.map(a => (
                <li key={a.id} className="achievement-item">
                  <div className="achievement-icon">🏆</div>
                  <div className="achievement-info">
                    <span className="achievement-title">{a.title}</span>
                    <span className="achievement-description">{a.description}</span>
                    <span className="achievement-game">{a.game} · {a.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
