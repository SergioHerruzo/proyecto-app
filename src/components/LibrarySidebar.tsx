import '../styles/Library.css'
import { useState, useCallback } from "react"
import type { Game } from "../types/games"
import type { InstallInfo } from "../services/tauri"
import GameContextMenu, { type ContextMenuItem } from "./GameContextMenu"

interface ContextMenuState {
  x: number
  y: number
  game: Game
}

interface LibrarySidebarProps {
  games: Game[]
  searchQuery: string
  onSearch: (q: string) => void
  onSelectGame?: (game: Game) => void
  selectedGameId?: string
  installedGames?: Record<string, InstallInfo>
  onOpenFolder?: (gameId: string) => void
  onUninstall?: (gameId: string) => void
  onManageBuilds?: (game: Game) => void
}

export default function LibrarySidebar({
  games,
  searchQuery,
  onSearch,
  onSelectGame,
  selectedGameId,
  installedGames = {},
  onOpenFolder,
  onUninstall,
  onManageBuilds,
}: LibrarySidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const filtered = games.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, game: Game) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, game })
  }, [])

  const buildMenuItems = (game: Game): ContextMenuItem[] => {
    const isInstalled = !!installedGames[game.id]
    return [
      {
        label: "Gestionar versiones",
        icon: "📦",
        onClick: () => {
          onSelectGame?.(game)
          onManageBuilds?.(game)
        },
      },
      {
        label: "Abrir carpeta",
        icon: "📁",
        disabled: !isInstalled,
        onClick: () => onOpenFolder?.(game.id),
      },
      {
        label: "Desinstalar",
        icon: "🗑",
        danger: true,
        disabled: !isInstalled,
        onClick: () => onUninstall?.(game.id),
      },
    ]
  }

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
            onContextMenu={(e) => handleContextMenu(e, game)}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData("gameId", game.id)
              e.dataTransfer.effectAllowed = "copy"
            }}
          >
            <div
              className="sidebar-game-thumb"
              style={{ backgroundImage: `url(${game.image})` }}
            />
            <span className="sidebar-game-title">{game.title}</span>
          </li>
        ))}
      </ul>

      {contextMenu && (
        <GameContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildMenuItems(contextMenu.game)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  )
}
