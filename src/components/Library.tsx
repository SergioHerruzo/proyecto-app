import '../styles/Library.css'
import { useState, useEffect, useCallback } from "react"
import { Gamepad2 } from "lucide-react"
import LibrarySidebar from "./LibrarySidebar"
import CollectionsView from "./CollectionsView"
import CollectionDetail from "./CollectionDetail"
import LibraryGameDetail from "./LibraryGameDetail"
import type { Game, Collection } from "../types/games"
import { useDownloads } from "../context/DownloadContext"
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

async function enrichCollections(
  list: Collection[],
  gameById: Map<string, Game>,
): Promise<Collection[]> {
  return Promise.all(
    list.map(async (col) => {
      if (col.previewUrls?.some(u => u)) return col
      try {
        const full = await getCollectionById(col.id)
        const previews = full.games
          .slice(0, 4)
          .map(g => {
            const owned = gameById.get(g.id)
            return g.image || owned?.icon || owned?.image || ''
          })
          .filter(Boolean)
        return { ...col, previewUrls: previews }
      } catch {
        return col
      }
    })
  )
}

export default function Library({ initialGameId, onInitialGameConsumed }: LibraryProps) {
  const [ownedGames, setOwnedGames] = useState<Game[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [openBuildsTab, setOpenBuildsTab] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const { installedGames, openInstallFolder, uninstallGame } = useDownloads()

  // Refresh collections (used after add/remove game) — also re-enriches with current ownedGames
  const loadCollections = useCallback(async (currentOwnedGames: Game[]) => {
    try {
      const page = await getUserCollections()
      const list = page.items.map(mapCollectionListItem)
      const gameById = new Map(currentOwnedGames.map(g => [g.id, g]))
      const enriched = await enrichCollections(list, gameById)
      setCollections(enriched)
    } catch (err) {
      console.error("[Library] getUserCollections failed:", err)
    }
  }, [])

  // Initial load: both requests run in parallel, then enrich collections with ownedGames
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const [summaries, collectionPage] = await Promise.all([
          getUserLibrary(),
          getUserCollections(),
        ])
        if (cancelled) return

        const games = summaries.map(mapGameSummary)
        const gameById = new Map(games.map(g => [g.id, g]))
        const list = collectionPage.items.map(mapCollectionListItem)
        const enriched = await enrichCollections(list, gameById)

        if (cancelled) return
        setOwnedGames(games)
        setCollections(enriched)
      } catch (err: unknown) {
        if (!cancelled) setFetchError((err as Error)?.message ?? "Error desconocido")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

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
    setOpenBuildsTab(false)
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
    loadCollections(ownedGames)
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
    loadCollections(ownedGames)
    if (selectedCollection?.id === collectionId) {
      setSelectedCollection(prev => prev
        ? { ...prev, games: prev.games.filter(g => g.id !== gameId) }
        : null
      )
    }
  }

  const handleContextOpenFolder = async (gameId: string) => {
    try {
      await openInstallFolder(gameId)
    } catch (e) {
      console.error("[Library] openInstallFolder:", e)
    }
  }

  const handleContextUninstall = async (gameId: string) => {
    try {
      await uninstallGame(gameId)
    } catch (e) {
      console.error("[Library] uninstallGame:", e)
    }
  }

  const handleContextManageBuilds = (game: Game) => {
    setSelectedCollection(null)
    setOpenBuildsTab(true)
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
        installedGames={installedGames}
        onOpenFolder={handleContextOpenFolder}
        onUninstall={handleContextUninstall}
        onManageBuilds={handleContextManageBuilds}
      />

      <main className="library-main">
        {selectedGame ? (
          <LibraryGameDetail
            key={selectedGame.id}
            game={selectedGame}
            initialTab={openBuildsTab ? "versiones" : undefined}
            onBack={() => { setSelectedGame(null); setOpenBuildsTab(false) }}
          />
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
