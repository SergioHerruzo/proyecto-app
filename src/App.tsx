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
import {
  getGames,
  getGameById,
  mapApiGameListItem,
  mapApiGame,
  mapGameSummary,
  setAuthToken,
  getCart,
  addToCart,
  removeFromCart,
} from "./services/api"
import { restoreSession, logout } from "./services/auth"
import type { AuthUser } from "./services/auth"

type Page = "home" | "library" | "cart" | "profile"

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [cartItems, setCartItems] = useState<Game[]>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin")
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Game[] | null>(null)
  const [searching, setSearching] = useState(false)

  const loadCartFromApi = async () => {
    try {
      const cart = await getCart()
      if (cart.game.length > 0) {
        setCartItems(cart.game.map(mapGameSummary))
      }
    } catch {
      // cart load failure is non-critical
    }
  }

  // Restore Cognito session on load
  useEffect(() => {
    restoreSession().then(user => {
      if (user) {
        setAuthUser(user)
        setAuthToken(user.accessToken)
        loadCartFromApi()
      }
    })
  }, [])

  useEffect(() => {
    getGames("", [], 1, 20)
      .then(page => setAllGames(page.items.map(mapApiGameListItem)))
      .catch(() => setError("No se pudieron cargar los juegos."))
      .finally(() => setLoading(false))
  }, [])

  const handleAuthSuccess = async (user: AuthUser) => {
    setAuthUser(user)
    setAuthToken(user.accessToken)
    setAuthModalOpen(false)
    await loadCartFromApi()
  }

  const handleSignOut = () => {
    logout()
    setAuthUser(null)
    setAuthToken(null)
    setCartItems([])
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const page = await getGames(query, [], 1, 20)
      setSearchResults(page.items.map(mapApiGameListItem))
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

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game)
    try {
      const detail = await getGameById(game.id)
      setSelectedGame(mapApiGame(detail))
    } catch {
      // keep partial data
    }
  }

  const handleAddToCart = async (game: Game) => {
    if (cartItems.find(g => g.id === game.id)) return
    setCartItems(prev => [...prev, game])
    if (authUser) {
      try { await addToCart(game.id) } catch { /* non-critical */ }
    }
  }

  const handleRemoveFromCart = async (id: string) => {
    setCartItems(prev => prev.filter(g => g.id !== id))
    if (authUser) {
      try { await removeFromCart(id) } catch { /* non-critical */ }
    }
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
        isAuthenticated={!!authUser}
        username={authUser?.username}
        onSignIn={() => { setAuthMode("signin"); setAuthModalOpen(true) }}
        onRegister={() => { setAuthMode("register"); setAuthModalOpen(true) }}
        onSignOut={handleSignOut}
      />

      {authModalOpen && !authUser && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthModalOpen(false)}
          onSwitchMode={setAuthMode}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {selectedGame ? (
        <GameDetail
          game={selectedGame}
          allGames={allGames}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onBack={() => setSelectedGame(null)}
          onSelectGame={handleSelectGame}
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
                          onSelectGame={handleSelectGame}
                        />
                      </>
                    ) : (
                      <>
                        <GameSection
                          title="Juegos disponibles"
                          games={allGames.slice(0, 6)}
                          variant="discount"
                          onAddToCart={handleAddToCart}
                          onSelectGame={handleSelectGame}
                        />
                        <GameSection
                          title="Juegos recomendados"
                          games={allGames}
                          variant="recommended"
                          onAddToCart={handleAddToCart}
                          onSelectGame={handleSelectGame}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          {currentPage === "library" && <Library />}
          {currentPage === "profile" && <Profile authUser={authUser} />}
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
