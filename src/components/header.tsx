import { useState, useRef, useEffect } from 'react'
import '../styles/Header.css'

type Page = "home" | "library" | "cart" | "profile"
type Theme = "dark" | "light"

interface HeaderProps {
  activePage?: Page
  onNavigate?: (page: Page) => void
  cartCount?: number
  isAuthenticated?: boolean
  username?: string
  profilePictureUrl?: string
  onSignIn?: () => void
  onRegister?: () => void
  onSignOut?: () => void
  theme?: Theme
  onToggleTheme?: () => void
  isDesktop?: boolean
  activeDownloads?: number
  onToggleDownloads?: () => void
}

export default function Header({
  activePage = "home",
  onNavigate,
  cartCount = 0,
  isAuthenticated = false,
  username,
  profilePictureUrl,
  onSignIn,
  onRegister,
  onSignOut,
  theme = "dark",
  onToggleTheme,
  isDesktop = false,
  activeDownloads = 0,
  onToggleDownloads,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

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

{isDesktop && isAuthenticated && (
  <button
    className="downloads-btn"
    onClick={onToggleDownloads}
    title="Ver descargas"
  >
    ↓

    {activeDownloads > 0 && (
      <span className="downloads-badge">
        {activeDownloads}
      </span>
    )}
  </button>
)}

<button
  className="theme-toggle"
  onClick={onToggleTheme}
  title={
    theme === "dark"
      ? "Cambiar a tema claro"
      : "Cambiar a tema oscuro"
  }
>
  {theme === "dark" ? "☀" : "🌙"}
</button>
        {isAuthenticated ? (
          <div className="profile-menu" ref={menuRef}>
            <button
              className="profile-avatar-btn"
              onClick={() => setMenuOpen(o => !o)}
              title={username}
            >
              {profilePictureUrl ? (
                <img src={profilePictureUrl} alt={username} className="profile-avatar-img" />
              ) : (
                <span className="profile-avatar-placeholder">
                  {username?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </button>
            {menuOpen && (
              <div className="profile-dropdown">
                <button
                  className="profile-dropdown-item"
                  onClick={() => { onToggleTheme?.(); setMenuOpen(false) }}
                >
                  {theme === "dark" ? "☀ Tema claro" : "🌙 Tema oscuro"}
                </button>
                <button
                  className="profile-dropdown-item profile-dropdown-signout"
                  onClick={() => { onSignOut?.(); setMenuOpen(false) }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              className="theme-toggle"
              onClick={onToggleTheme}
              title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            >
              {theme === "dark" ? "☀" : "🌙"}
            </button>
            <button className="btn-outline" onClick={onSignIn}>Iniciar sesión</button>
            <button className="btn-primary" onClick={onRegister}>Registrarse</button>
          </>
        )}
      </div>
    </header>
  )
}
