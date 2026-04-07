import logo from "../img/IndieGames_logo_dark.png"

type Page = "home" | "library" | "cart" | "profile"

interface HeaderProps {
  activePage?: Page
  onNavigate?: (page: Page) => void
  cartCount?: number
  onSignIn?: () => void
  onRegister?: () => void
}

export default function Header({ activePage = "home", onNavigate, cartCount = 0, onSignIn, onRegister }: HeaderProps) {
  return (
    <header className="header">
      <div className="logo-badge">
        <img className="logo-icon" src={logo} alt="Logo" />
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
        <button className="btn-outline" onClick={onSignIn}>Sign in</button>
        <button className="btn-primary" onClick={onRegister}>Register</button>
      </div>
    </header>
  )
}
