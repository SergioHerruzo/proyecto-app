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
  checkoutCart,
  getUserLibrary,
} from "./services/api"
import { restoreSession, logout } from "./services/auth"
import type { AuthUser } from "./services/auth"
import { isTauri } from "./utils/platform"

type Page = "home" | "library" | "cart" | "profile" | "search"
type Theme = "dark" | "light"

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [cartItems, setCartItems] = useState<Game[]>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin")
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [theme, setTheme] = useState<Theme>("dark")

  const [ownedGameIds, setOwnedGameIds] = useState<Set<string>>(new Set())

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

  const loadLibraryIds = async () => {
    try {
      const summaries = await getUserLibrary()
      setOwnedGameIds(new Set(summaries.map(s => s.id)))
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark")

  // Restore Cognito session on load
  useEffect(() => {
    restoreSession().then(user => {
      if (user) {
        setAuthUser(user)
        setAuthToken(user.accessToken)
        loadCartFromApi()
        loadLibraryIds()
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
    await loadLibraryIds()
  }

  const handleSignOut = () => {
    logout()
    setAuthUser(null)
    setAuthToken(null)
    setCartItems([])
    setOwnedGameIds(new Set())
    setCurrentPage("home")
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    setCurrentPage("search")
    setSearching(true)
    try {
      const page = await getGames(query, [], 1, 50)
      setSearchResults(page.items.map(mapApiGameListItem))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSearchResults(null)
    setCurrentPage("home")
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
    if (!authUser) {
      setAuthMode("signin")
      setAuthModalOpen(true)
      return
    }
    if (ownedGameIds.has(game.id)) return
    if (cartItems.find(g => g.id === game.id)) return
    setCartItems(prev => [...prev, game])
    try { await addToCart(game.id) } catch { /* non-critical */ }
  }

  const handleRemoveFromCart = async (id: string) => {
    setCartItems(prev => prev.filter(g => g.id !== id))
    if (authUser) {
      try { await removeFromCart(id) } catch { /* non-critical */ }
    }
  }

  const handleCheckout = async () => {
    await checkoutCart()
    setCartItems([])
    await loadLibraryIds()
    setCurrentPage(isTauri ? "library" : "home")
  }

  const handleNavigate = (page: Page) => {
    if (page === "library" && !isTauri) return
    setSelectedGame(null)
    if (page !== "search") {
      setSearchQuery("")
      setSearchResults(null)
    }
    setCurrentPage(page)
  }

  const featuredGame = allGames[0]
  const discountedGames = allGames.filter(g => g.discount !== undefined && g.discount > 0)

  return (
    <>
      <Header
        activePage={currentPage === "search" ? "home" : currentPage}
        onNavigate={handleNavigate}
        cartCount={cartItems.length}
        isAuthenticated={!!authUser}
        username={authUser?.username}
        onSignIn={() => { setAuthMode("signin"); setAuthModalOpen(true) }}
        onRegister={() => { setAuthMode("register"); setAuthModalOpen(true) }}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
        isDesktop={isTauri}
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
          ownedGameIds={ownedGameIds}
          onAddToCart={handleAddToCart}
          onBack={() => setSelectedGame(null)}
          onSelectGame={handleSelectGame}
        />
      ) : (
        <>
          {(currentPage === "home" || currentPage === "search") && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearch}
              />

              {currentPage === "search" ? (
                <div className="home-page">
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    <button
                      onClick={handleClearSearch}
                      style={{ background: "none", border: "none", color: "#6bb8e8", cursor: "pointer", fontSize: "14px", padding: 0 }}
                    >
                      ← Volver
                    </button>
                    <p style={{ color: "#aaa", margin: 0 }}>
                      {searching
                        ? "Buscando..."
                        : `${(searchResults ?? []).length} resultado${(searchResults ?? []).length !== 1 ? "s" : ""} para "${searchQuery}"`}
                    </p>
                  </div>
                  {!searching && (
                    <GameSection
                      title="Resultados de búsqueda"
                      games={searchResults ?? []}
                      variant="recommended"
                      ownedGameIds={ownedGameIds}
                      onAddToCart={handleAddToCart}
                      onSelectGame={handleSelectGame}
                    />
                  )}
                </div>
              ) : (
                <>
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
                      {featuredGame && (
                        <HeroGame
                          game={featuredGame}
                          ownedGameIds={ownedGameIds}
                          onAddToCart={handleAddToCart}
                          onSelectGame={handleSelectGame}
                        />
                      )}
                      <div className="home-page">
                        {discountedGames.length > 0 && (
                          <GameSection
                            title="Ofertas"
                            games={discountedGames}
                            variant="discount"
                            ownedGameIds={ownedGameIds}
                            onAddToCart={handleAddToCart}
                            onSelectGame={handleSelectGame}
                          />
                        )}
                        <GameSection
                          title="Juegos disponibles"
                          games={allGames.slice(0, 6)}
                          variant="discount"
                          ownedGameIds={ownedGameIds}
                          onAddToCart={handleAddToCart}
                          onSelectGame={handleSelectGame}
                        />
                        <GameSection
                          title="Juegos recomendados"
                          games={allGames}
                          variant="recommended"
                          ownedGameIds={ownedGameIds}
                          onAddToCart={handleAddToCart}
                          onSelectGame={handleSelectGame}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
          {currentPage === "library" && <Library />}
          {currentPage === "profile" && <Profile authUser={authUser} />}
          {currentPage === "cart" && (
            <div className="home-page">
              <Cart items={cartItems} onRemove={handleRemoveFromCart} onContinueShopping={() => setCurrentPage("home")} onCheckout={handleCheckout} />
            </div>
          )}
        </>
      )}
    </>
  )
}

export default App
