import { useState, useEffect, useRef } from 'react'
import '../styles/SearchBar.css'
import type { Game } from '../types/games'

const HISTORY_KEY = 'searchHistory'
const MAX_HISTORY = 5

function getHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') }
  catch { return [] }
}

function saveToHistory(query: string) {
  const trimmed = query.trim()
  if (!trimmed) return
  const prev = getHistory().filter(q => q !== trimmed)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([trimmed, ...prev].slice(0, MAX_HISTORY)))
}

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  allGames?: Game[]
  onSelectGame?: (game: Game) => void
}

export default function SearchBar({ value, onChange, onSearch, allGames = [], onSelectGame }: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setHistory(getHistory())
  }, [open])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = value.trim()
    ? allGames.filter(g => g.title.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 5)
    : []

  const showHistory = !value.trim() && history.length > 0
  const showDropdown = open && (suggestions.length > 0 || showHistory)

  const handleSearch = (query: string) => {
    saveToHistory(query)
    setHistory(getHistory())
    setOpen(false)
    setActiveIndex(-1)
    onSearch(query)
  }

  const handleSelectGame = (game: Game) => {
    setOpen(false)
    setActiveIndex(-1)
    onSelectGame?.(game)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectGame(suggestions[activeIndex])
      } else {
        handleSearch(value)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container" ref={containerRef}>
        <div className={`search-bar-inner ${showDropdown ? 'search-bar-inner--open' : ''}`}>
          <button className="search-btn" onClick={() => handleSearch(value)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <input
            type="text"
            placeholder="Buscar juegos..."
            className="search-input"
            value={value}
            onChange={e => { onChange(e.target.value); setActiveIndex(-1) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {showDropdown && (
          <div className="search-dropdown">
            {showHistory && (
              <>
                <div className="search-dropdown-label">Búsquedas recientes</div>
                {history.map(q => (
                  <button
                    key={q}
                    className="search-dropdown-item"
                    onClick={() => { onChange(q); handleSearch(q) }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="search-dropdown-history-text">{q}</span>
                  </button>
                ))}
              </>
            )}

            {suggestions.length > 0 && (
              <>
                {showHistory && <div className="search-dropdown-divider" />}
                {suggestions.map((game, i) => (
                  <button
                    key={game.id}
                    className={`search-dropdown-item search-dropdown-game ${i === activeIndex ? 'search-dropdown-item--active' : ''}`}
                    onClick={() => handleSelectGame(game)}
                  >
                    <div
                      className="search-dropdown-thumb"
                      style={{ backgroundImage: `url(${game.image})` }}
                    />
                    <div className="search-dropdown-info">
                      <span className="search-dropdown-title">{game.title}</span>
                      <span className="search-dropdown-genre">{game.genres.slice(0, 2).join(', ')}</span>
                    </div>
                    {game.price !== undefined && (
                      <span className="search-dropdown-price">{game.price.toFixed(2)}€</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
