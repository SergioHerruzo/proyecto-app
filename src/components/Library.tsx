import '../styles/Library.css'
import { useState, useEffect, useCallback } from "react"
import { Gamepad2 } from "lucide-react"
import LibrarySidebar from "./LibrarySidebar"
import CollectionsView from "./CollectionsView"
import CollectionDetail from "./CollectionDetail"
import LibraryGameDetail from "./LibraryGameDetail"
import type { Game, Collection } from "../types/games"
import {
  getUserLibrary,
  mapGameSummary,
  getUserCollections,
  mapCollectionListItem,
  createCollection,
  deleteCollection,
  addGameToCollection,
  removeGameFromCollection,
  getCollectionById,
} from "../services/api"

interface LibraryProps {
  initialGameId?: string | null
  onInitialGameConsumed?: () => void
}

export default function Library({ initialGameId, onInitialGameConsumed }: LibraryProps) {
  const [ownedGames, setOwnedGames] = useState<Game[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadCollections = useCallback(async () => {
    try {
      const page = await getUserCollections()
      setCollections(page.items.map(mapCollectionListItem))
    } catch (err) {
      console.error("[Library] getUserCollections failed:", err)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      getUserLibrary().then(summaries => {
        console.log("[Library] getUserLibrary result:", summaries)
        setOwnedGames(summaries.map(mapGameSummary))
      }),
      loadCollections(),
    ])
      .catch(err => {
        console.error("[Library] initial load failed:", err)
        setFetchError(err?.message ?? "Error desconocido")
      })
      .finally(() => setLoading(false))
  }, [loadCollections])

  useEffect(() => {
    if (!initialGameId || loading || ownedGames.length === 0) return
    const game = ownedGames.find(g => g.id === initialGameId)
    if (game) {
      setSelectedGame(game)
      setSelectedCollection(null)
      onInitialGameConsumed?.()
    }
  }, [initialGameId, loading, ownedGames, onInitialGameConsumed])

  const handleSelectGame = (game: Game) => {
    setSelectedCollection(null)
    setSelectedGame(game)
  }

  const handleSelectCollection = async (collection: Collection) => {
    setSelectedGame(null)
    try {
      const full = await getCollectionById(collection.id)
      setSelectedCollection(full)
    } catch {
      setSelectedCollection(collection)
    }
  }

  const handleCreateCollection = async (name: string) => {
    const created = await createCollection(name)
    const newCollection: Collection = { id: created.id, name: created.name, games: [], previewUrls: [] }
    setCollections(prev => [newCollection, ...prev])
  }

  const handleDeleteCollection = async (collectionId: string) => {
    await deleteCollection(collectionId)
    setCollections(prev => prev.filter(c => c.id !== collectionId))
    if (selectedCollection?.id === collectionId) setSelectedCollection(null)
  }

  const handleAddGameToCollection = async (collectionId: string, gameId: string) => {
    await addGameToCollection(collectionId, gameId)
    // Refresh the collection list to update preview thumbnails
    loadCollections()
    // If viewing that collection detail, refresh it
    if (selectedCollection?.id === collectionId) {
      try {
        const full = await getCollectionById(collectionId)
        setSelectedCollection(full)
      } catch {
        // keep current
      }
    }
  }

  const handleRemoveGameFromCollection = async (collectionId: string, gameId: string) => {
    await removeGameFromCollection(collectionId, gameId)
    loadCollections()
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection(prev => prev
        ? { ...prev, games: prev.games.filter(g => g.id !== gameId) }
        : null
      )
    }
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
        <Gamepad2 size={40} style={{ opacity: 0.4 }} />
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
            onAddGame={(gameId) => handleAddGameToCollection(selectedCollection.id, gameId)}
            onRemoveGame={(gameId) => handleRemoveGameFromCollection(selectedCollection.id, gameId)}
          />
        ) : (
          <CollectionsView
            collections={collections}
            onSelectCollection={handleSelectCollection}
            onCreateCollection={handleCreateCollection}
            onDeleteCollection={handleDeleteCollection}
            onAddGameToCollection={handleAddGameToCollection}
          />
        )}
      </main>
    </div>
  )
}
