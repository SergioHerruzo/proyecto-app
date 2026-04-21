type Page = "home" | "library" | "cart" | "profile"

interface HeaderProps {
  activePage?: Page
  onNavigate?: (page: Page) => void
  cartCount?: number
  isAuthenticated?: boolean
  username?: string
  onSignIn?: () => void
  onRegister?: () => void
  onSignOut?: () => void
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
}: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-badge">
        <span style={{ color: "#fff", fontWeight: "bold", fontSize: "1.3rem", letterSpacing: "0.02em" }}>
          IndieGames
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
        <a
          href="#"
          className={`nav-link ${activePage === "library" ? "active" : ""}`}
          onClick={e => { e.preventDefault(); onNavigate?.("library") }}
        >
          Biblioteca
        </a>
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
      </nav>

      <div className="auth-buttons">
        {isAuthenticated ? (
          <>
            <span className="auth-username">{username}</span>
            <button className="btn-outline" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            <button className="btn-outline" onClick={onSignIn}>Sign in</button>
            <button className="btn-primary" onClick={onRegister}>Register</button>
          </>
        )}
      </div>
    </header>
  )
}
