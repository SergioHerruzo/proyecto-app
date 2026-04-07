import { useState } from "react"
import LibrarySidebar from "./LibrarySidebar"
import CollectionsView from "./CollectionsView"
import CollectionDetail from "./CollectionDetail"
import LibraryGameDetail from "./LibraryGameDetail"
import type { Game, Collection } from "../types/games"

const ownedGames: Game[] = [
  { id: 1, title: "Cyber Adventure", price: 24.99, genres: ["Acción", "RPG"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 2, title: "Space Survival", price: 19.99, genres: ["Supervivencia", "Sci-Fi"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 3, title: "Fantasy World", price: 24.99, genres: ["RPG", "Aventura"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 4, title: "Dark Dungeon", price: 24.99, genres: ["Roguelike", "Acción"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 5, title: "Pixel Quest", price: 14.99, genres: ["Plataformas", "Indie"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 6, title: "Ocean Depths", price: 24.99, genres: ["Exploración", "Aventura"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 7, title: "Neon City", price: 19.99, genres: ["Acción", "Indie"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 8, title: "Lost Forest", price: 19.99, genres: ["Aventura", "Puzzle"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 9, title: "Iron Realms", price: 19.99, genres: ["Estrategia", "RPG"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 10, title: "Shadow Blade", price: 19.99, genres: ["Acción", "Plataformas"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 11, title: "Void Runner", price: 19.99, genres: ["Sci-Fi", "Shooter"], image: "https://placehold.co/300x400/2a2a2a/555" },
  { id: 12, title: "Crystal Caves", price: 19.99, genres: ["Puzzle", "Indie"], image: "https://placehold.co/300x400/2a2a2a/555" },
]

const collections: Collection[] = [
  { id: 1, name: "Modo Historia", games: [ownedGames[0], ownedGames[2], ownedGames[5], ownedGames[7]] },
  { id: 2, name: "Multijugador", games: [ownedGames[1], ownedGames[3], ownedGames[6], ownedGames[10]] },
  { id: 3, name: "RPG", games: [ownedGames[0], ownedGames[2], ownedGames[8]] },
  { id: 4, name: "Indie", games: [ownedGames[4], ownedGames[6], ownedGames[11]] },
  { id: 5, name: "Favoritos", games: [ownedGames[0], ownedGames[1], ownedGames[4], ownedGames[9]] },
]

export default function Library() {
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleSelectGame = (game: Game) => {
    setSelectedCollection(null)
    setSelectedGame(game)
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
