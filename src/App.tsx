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
import DownloadsBottomBar from "./components/DownloadsBottomBar"
import DownloadsPage from "./components/DownloadsPage"
import { DownloadProvider, useDownloads } from "./context/DownloadContext"
import type { Game } from "./types/games"
import {
  getGames,
  getGameById,
  getGenres,
  mapApiGameListItem,
  mapApiGame,
  mapGameSummary,
  setAuthToken,
  setCurrentUserId,
  getCurrentUser,
  getCart,
  addToCart,
  removeFromCart,
  checkoutCart,
  getUserLibrary,
  getGameBuildsAsUser,
  getGameBuildById,
  type GameSummary,
  type BasicUserResponse,
} from "./services/api"
import { restoreSession, logout } from "./services/auth"
import type { AuthUser } from "./services/auth"
import { isTauri } from "./utils/platform"

type Page = "home" | "library" | "cart" | "profile" | "search" | "downloads"
type Theme = "dark" | "light"

// AppContent is always inside DownloadProvider so useDownloads() is safe here
function AppContent({
  authUser,
  onAuthChange,
}: {
  authUser: AuthUser | null
  onAuthChange: (user: AuthUser | null) => void
}) {
  const [currentPage, setCurrentPage] = useState<Page>("home")
  const [cartItems, setCartItems] = useState<Game[]>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin")
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [apiUser, setApiUser] = useState<BasicUserResponse | null>(null)
  const [theme, setTheme] = useState<Theme>("dark")

  const [ownedGameIds, setOwnedGameIds] = useState<Set<string>>(new Set())

  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [libraryInitialGameId, setLibraryInitialGameId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Game[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  // These are no-ops on web (isTauri guards are inside the provider)
  const { downloads, installedGames, startDownload, refreshInstalled } = useDownloads()

  const activeDownloads = Object.values(downloads).filter(
    (d) => d.status === "downloading" || d.status === "queued",
  ).length

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === "dark" ? "light" : "dark"))

  const loadCartFromApi = async () => {
    try {
      const cart = await getCart()
      if (cart.game.length > 0) setCartItems(cart.game.map(mapGameSummary))
    } catch {
      // non-critical
    }
  }

  const loadLibraryIds = async (): Promise<GameSummary[]> => {
    try {
      const summaries = await getUserLibrary()
      setOwnedGameIds(new Set(summaries.map((s) => s.id)))
      return summaries
    } catch {
      return []
    }
  }

  const loadCurrentUserId = async () => {
    try {
      const profile = await getCurrentUser()
      setCurrentUserId(profile.userId)
      setApiUser(profile)
    } catch {
      // non-critical
    }
  }

  const checkAndAutoUpdate = async (summaries: GameSummary[]) => {
    if (!isTauri) return

    await refreshInstalled()

    for (const [gameId, info] of Object.entries(installedGames)) {
      const libEntry = summaries.find((s) => s.id === gameId)
      if (!libEntry) continue

      try {
        const buildsPage = await getGameBuildsAsUser(gameId)
        const releaseBuild = buildsPage.items.find((b) => b.isReleaseBuild)

        if (!releaseBuild || releaseBuild.id === info.buildId) continue

        const buildDetail = await getGameBuildById(releaseBuild.id)

        const gameObj: Game = {
          id: gameId,
          title: libEntry.title,
          genres: [],
          image: "",
        }

        await startDownload(gameObj, buildDetail)

        console.log(`[AutoUpdate] ${gameId} → ${releaseBuild.id}`)
      } catch (e) {
        console.error(`[AutoUpdate] ${gameId}:`, e)
      }
    }
  }

  // Restore session on mount
  useEffect(() => {
    restoreSession().then(async (user) => {
      if (user) {
        setAuthToken(user.accessToken)
        onAuthChange(user)

        await loadCartFromApi()

        const summaries = await loadLibraryIds()

        await loadCurrentUserId()
        await checkAndAutoUpdate(summaries)
      }
    })
  }, [])

  useEffect(() => {
    getGames("", [], 1, 20)
      .then((page) => setAllGames(page.items.map(mapApiGameListItem)))
      .catch(() => setError("No se pudieron cargar los juegos."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    getGenres("", 1, 50)
      .then(page => setGenres(page.items.map(g => ({
        id: g.id,
        name: g.name,
      }))))
      .catch(() => {})
  }, [])

  const handleAuthSuccess = async (user: AuthUser) => {
    setAuthToken(user.accessToken)
    setAuthModalOpen(false)
    onAuthChange(user)

    await loadCartFromApi()

    const summaries = await loadLibraryIds()

    await loadCurrentUserId()
    await checkAndAutoUpdate(summaries)
  }

  const handleSignOut = () => {
    logout()
    setApiUser(null)
    setAuthToken(null)
    setCurrentUserId(null)
    setCartItems([])
    setOwnedGameIds(new Set())
    setCurrentPage("home")
    onAuthChange(null)
  }

  const handleSearch = async (
    query: string,
    genreIds: string[] = selectedGenres,
  ) => {
    const trimmed = query.trim()

    if (!trimmed && genreIds.length === 0) return

    // Si el texto coincide con un nombre de género,
    // filtra por ese género en vez de por título
    const matchedGenres = trimmed
      ? genres.filter(g =>
          g.name.toLowerCase().includes(trimmed.toLowerCase()),
        )
      : []

    const effectiveTitle = matchedGenres.length > 0 ? "" : trimmed

    const effectiveGenres = [
      ...new Set([
        ...genreIds,
        ...matchedGenres.map(g => g.id),
      ]),
    ]

    setCurrentPage("search")
    setSearching(true)

    try {
      const page = await getGames(
        effectiveTitle,
        effectiveGenres,
        1,
        50,
      )

      setSearchResults(page.items.map(mapApiGameListItem))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Unused
  /*const handleToggleGenre = (genreId: string) => {
    const next = selectedGenres.includes(genreId)
      ? selectedGenres.filter(id => id !== genreId)
      : [...selectedGenres, genreId]

    setSelectedGenres(next)
    handleSearch(searchQuery, next)
  }*/

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setSelectedGenres([])
    setSearchResults(null)
    setCurrentPage("home")
  }

  const handleSelectGame = async (game: Game) => {
    setSelectedGame(game)
    setLoadingDetail(true)

    try {
      const detail = await getGameById(game.id)
      setSelectedGame(mapApiGame(detail))
    } catch {
      // keep partial data
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddToCart = async (game: Game) => {
    if (!authUser) {
      setAuthMode("signin")
      setAuthModalOpen(true)
      return
    }

    if (ownedGameIds.has(game.id)) return
    if (cartItems.find((g) => g.id === game.id)) return

    setCartItems((prev) => [...prev, game])

    try {
      await addToCart(game.id)
    } catch {
      // non-critical
    }
  }

  const handleRemoveFromCart = async (id: string) => {
    setCartItems((prev) => prev.filter((g) => g.id !== id))

    if (authUser) {
      try {
        await removeFromCart(id)
      } catch {
        // non-critical
      }
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

  const discountedGames = allGames.filter(
    (g) => g.discount !== undefined && g.discount > 0,
  )

  return (
    <>
      <Header
        activePage={currentPage === "search" ? "home" : currentPage}
        onNavigate={handleNavigate}
        cartCount={cartItems.length}
        isAuthenticated={!!authUser}
        username={authUser?.username}
        profilePictureUrl={apiUser?.profilePicture?.smallPictureUrl}
        onSignIn={() => {
          setAuthMode("signin")
          setAuthModalOpen(true)
        }}
        onRegister={() => {
          setAuthMode("register")
          setAuthModalOpen(true)
        }}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
        isDesktop={isTauri}
        activeDownloads={activeDownloads}
        onToggleDownloads={() => setCurrentPage("downloads")}
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
          loading={loadingDetail}
          onViewInLibrary={isTauri
            ? () => {
                setLibraryInitialGameId(selectedGame.id)
                setSelectedGame(null)
                handleNavigate("library")
              }
            : undefined}
          onSearchByGenre={(genre) => {
            setSelectedGame(null)
            setSearchQuery(genre)
            handleSearch(genre)
          }}
        />
      ) : (
        <>
          {(currentPage === "home" || currentPage === "search") && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                allGames={allGames}
                onSelectGame={handleSelectGame}
              />

              {currentPage === "search" ? (
                <div className="home-page">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <button
                      onClick={handleClearSearch}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#a78bfa",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: 0,
                      }}
                    >
                      ← Volver
                    </button>

                    <p style={{ color: "#aaa", margin: 0 }}>
                      {searching
                        ? "Buscando..."
                        : `${(searchResults ?? []).length} resultado${
                            (searchResults ?? []).length !== 1 ? "s" : ""
                          } para "${searchQuery}"`}
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
                    <div
                      style={{
                        textAlign: "center",
                        padding: "4rem",
                        color: "#aaa",
                      }}
                    >
                      Cargando juegos...
                    </div>
                  )}

                  {error && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "4rem",
                        color: "#f44",
                      }}
                    >
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
                          onViewInLibrary={isTauri
                            ? () => {
                                setLibraryInitialGameId(featuredGame.id)
                                handleNavigate("library")
                              }
                            : undefined}
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

          {currentPage === "library" && (
            <Library
              initialGameId={libraryInitialGameId}
              onInitialGameConsumed={() => setLibraryInitialGameId(null)}
            />
          )}
          {currentPage === "downloads" && (
            <DownloadsPage onBack={() => setCurrentPage("home")} />
          )}
          {currentPage === "profile" && (
            <Profile
              authUser={authUser}
              onNavigateToLibrary={
                isTauri
                  ? () => handleNavigate("library")
                  : undefined
              }
            />
          )}

          {currentPage === "cart" && (
            <div className="home-page">
              <Cart
                items={cartItems}
                onRemove={handleRemoveFromCart}
                onContinueShopping={() => setCurrentPage("home")}
                onCheckout={handleCheckout}
              />
            </div>
          )}
        </>
      )}
      {isTauri && (
        <DownloadsBottomBar onNavigateToDownloads={() => setCurrentPage("downloads")} />
      )}
    </>
  )
}

function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)

  return (
    <DownloadProvider isAuthenticated={!!authUser}>
      <AppContent
        authUser={authUser}
        onAuthChange={setAuthUser}
      />
    </DownloadProvider>
  )
}

export default App