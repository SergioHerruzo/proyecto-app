import type { Game } from "../types/games"

interface LibrarySidebarProps {
  games: Game[]
  searchQuery: string
  onSearch: (q: string) => void
  onSelectGame?: (game: Game) => void
  selectedGameId?: number
}

export default function LibrarySidebar({ games, searchQuery, onSearch, onSelectGame, selectedGameId }: LibrarySidebarProps) {
  const filtered = games.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="library-sidebar">
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      <ul className="sidebar-game-list">
        {filtered.map(game => (
          <li
            key={game.id}
            className={`sidebar-game-item ${game.id === selectedGameId ? "sidebar-game-item--active" : ""}`}
            onClick={() => onSelectGame?.(game)}
          >
            <div
              className="sidebar-game-thumb"
              style={{ backgroundImage: `url(${game.image})` }}
            />
            <span className="sidebar-game-title">{game.title}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
