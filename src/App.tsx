import { useState, useEffect } from "react"
import Header from "./components/header"
import SearchBar from "./components/searchBar"
import HeroGame from "./components/heroGame"
import GameSection from "./components/gameSection"
import Library from "./components/Library"
import Cart from "./components/Cart"
import Profile from "./components/Profile"
import AuthModal from "./components/AuthModal"
import GameDetail from "./components/GameDetail"
import type { Game } from "./types/games"
import { searchGamesByName, mapApiGame } from "./services/api"

type Page = "home" | "library" | "cart" | "profile"
type AuthMode = "signin" | "register"

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [cartItems, setCartItems] = useState<Game[]>([])
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Game[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    searchGamesByName("", 20)
      .then(page => setAllGames(page.items.map(mapApiGame)))
      .catch(() => setError("No se pudieron cargar los juegos."))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const page = await searchGamesByName(query, 20)
      setSearchResults(page.items.map(mapApiGame))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) setSearchResults(null)
  }

  const handleAddToCart = (game: Game) => {
    setCartItems(prev => prev.find(g => g.id === game.id) ? prev : [...prev, game])
  }

  const handleRemoveFromCart = (id: number) => {
    setCartItems(prev => prev.filter(g => g.id !== id))
  }

  const handleNavigate = (page: Page) => {
    setSelectedGame(null)
    setCurrentPage(page)
  }

  const featuredGame = allGames[0]
  const displayedGames = searchResults ?? allGames
  const showSearchResults = searchResults !== null

  return (
    <>
      <Header
        activePage={currentPage}
        onNavigate={handleNavigate}
        cartCount={cartItems.length}
        onSignIn={() => setAuthMode("signin")}
        onRegister={() => setAuthMode("register")}
      />
      {authMode && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}
      {selectedGame ? (
        <GameDetail
          game={selectedGame}
          allGames={allGames}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onBack={() => setSelectedGame(null)}
          onSelectGame={setSelectedGame}
        />
      ) : (
        <>
          {currentPage === "home" && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearch}
              />

              {loading && (
                <div style={{ textAlign: "center", padding: "4rem", color: "#aaa" }}>
                  Cargando juegos...
                </div>
              )}

              {error && (
                <div style={{ textAlign: "center", padding: "4rem", color: "#f44" }}>
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  {!showSearchResults && featuredGame && (
                    <HeroGame game={featuredGame} />
                  )}

                  <div className="home-page">
                    {showSearchResults ? (
                      <>
                        <p style={{ color: "#aaa", margin: "0 0 .5rem" }}>
                          {searching
                            ? "Buscando..."
                            : `${displayedGames.length} resultado${displayedGames.length !== 1 ? "s" : ""} para "${searchQuery}"`}
                        </p>
                        <GameSection
                          title="Resultados de búsqueda"
                          games={displayedGames}
                          variant="recommended"
                          onAddToCart={handleAddToCart}
                          onSelectGame={setSelectedGame}
                        />
                      </>
                    ) : (
                      <>
                        <GameSection
                          title="Juegos disponibles"
                          games={allGames.slice(0, 6)}
                          variant="discount"
                          onAddToCart={handleAddToCart}
                          onSelectGame={setSelectedGame}
                        />
                        <GameSection
                          title="Juegos recomendados"
                          games={allGames}
                          variant="recommended"
                          onAddToCart={handleAddToCart}
                          onSelectGame={setSelectedGame}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {currentPage === "library" && <Library />}
          {currentPage === "profile" && <Profile />}
          {currentPage === "cart" && (
            <div className="home-page">
              <Cart items={cartItems} onRemove={handleRemoveFromCart} onContinueShopping={() => setCurrentPage("home")} />
            </div>
          )}
        </>
      )}
    </>
  )
}

export default App
