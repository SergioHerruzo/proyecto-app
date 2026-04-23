import '../styles/Header.css'

type Page = "home" | "library" | "cart" | "profile"
type Theme = "dark" | "light"

interface HeaderProps {
  activePage?: Page
  onNavigate?: (page: Page) => void
  cartCount?: number
  isAuthenticated?: boolean
  username?: string
  onSignIn?: () => void
  onRegister?: () => void
  onSignOut?: () => void
  theme?: Theme
  onToggleTheme?: () => void
  isDesktop?: boolean
}

export default function Header({
  activePage = "home",
  onNavigate,
  cartCount = 0,
  isAuthenticated = false,
  username,
  onSignIn,
  onRegister,
  onSignOut,
  theme = "dark",
  onToggleTheme,
  isDesktop = false,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-badge">
        <span style={{ color: "var(--text-1)", fontWeight: "bold", fontSize: "1.3rem", letterSpacing: "0.02em" }}>
          Indie Games
        </span>
      </div>

      <nav className="nav">
        <a
          href="#"
          className={`nav-link ${activePage === "home" ? "active" : ""}`}
          onClick={e => { e.preventDefault(); onNavigate?.("home") }}
        >
          Inicio
        </a>

        {isDesktop && isAuthenticated && (
          <a
            href="#"
            className={`nav-link ${activePage === "library" ? "active" : ""}`}
            onClick={e => { e.preventDefault(); onNavigate?.("library") }}
          >
            Biblioteca
          </a>
        )}

        {isAuthenticated && (
          <>
            <a
              href="#"
              className={`nav-link ${activePage === "cart" ? "active" : ""}`}
              onClick={e => { e.preventDefault(); onNavigate?.("cart") }}
            >
              Carrito {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </a>
            <a
              href="#"
              className={`nav-link ${activePage === "profile" ? "active" : ""}`}
              onClick={e => { e.preventDefault(); onNavigate?.("profile") }}
            >
              Perfil
            </a>
          </>
        )}
      </nav>

      <div className="auth-buttons">
        {!isDesktop && (
          <a
            className="btn-download"
            href="/indie-games-desktop.zip"
            download
            title="Descargar aplicación de escritorio"
          >
            ⬇ Descargar
          </a>
        )}

        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>

        {isAuthenticated ? (
          <>
            <span className="auth-username">{username}</span>
            <button className="btn-outline" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="btn-outline" onClick={onSignIn}>Iniciar sesión</button>
            <button className="btn-primary" onClick={onRegister}>Registrarse</button>
          </>
        )}
      </div>
    </header>
  )
}
