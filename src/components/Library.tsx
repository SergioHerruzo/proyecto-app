import '../styles/Library.css'
import { useState, useEffect } from "react"
import LibrarySidebar from "./LibrarySidebar"
import CollectionsView from "./CollectionsView"
import CollectionDetail from "./CollectionDetail"
import LibraryGameDetail from "./LibraryGameDetail"
import type { Game, Collection } from "../types/games"
import { getUserLibrary, mapGameSummary } from "../services/api"

export default function Library() {
  const [ownedGames, setOwnedGames] = useState<Game[]>([])
  const [collections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    getUserLibrary()
      .then(summaries => setOwnedGames(summaries.map(mapGameSummary)))
      .catch(err => {
        console.error("[Library] getUserLibrary failed:", err)
        setFetchError(err?.message ?? "Error desconocido")
        setOwnedGames([])
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelectGame = (game: Game) => {
    setSelectedCollection(null)
    setSelectedGame(game)
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 50px)", color: "var(--text-4)" }}>
        Cargando biblioteca...
      </div>
    )
  }

  if (fetchError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 50px)", gap: "12px", color: "var(--text-4)" }}>
        <p style={{ margin: 0, fontSize: "15px", color: "#f44" }}>Error al cargar la biblioteca</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-5)" }}>{fetchError}</p>
      </div>
    )
  }

  if (ownedGames.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 50px)", gap: "12px", color: "var(--text-4)" }}>
        <span style={{ fontSize: "2.5rem" }}>🎮</span>
        <p style={{ margin: 0, fontSize: "15px" }}>Tu biblioteca está vacía</p>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-5)" }}>Los juegos que compres aparecerán aquí</p>
      </div>
    )
  }

  return (
    <div className="library">
      <LibrarySidebar
        games={ownedGames}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSelectGame={handleSelectGame}
        selectedGameId={selectedGame?.id}
      />

      <main className="library-main">
        {selectedGame ? (
          <LibraryGameDetail game={selectedGame} />
        ) : selectedCollection ? (
          <CollectionDetail
            collection={selectedCollection}
            onBack={() => setSelectedCollection(null)}
            onSelectGame={handleSelectGame}
          />
        ) : (
          <CollectionsView
            collections={collections}
            onSelectCollection={setSelectedCollection}
          />
        )}
      </main>
    </div>
  )
}
