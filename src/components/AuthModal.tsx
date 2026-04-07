import { useState } from "react"

type AuthMode = "signin" | "register"

interface AuthModalProps {
  mode: AuthMode
  onClose: () => void
  onSwitchMode: (mode: AuthMode) => void
}

export default function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="friend-modal-close" onClick={onClose}>✕</button>

        <h2 className="auth-title">
          {mode === "signin" ? "Iniciar sesión" : "Registro"}
        </h2>

        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {mode === "register" && (
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
              />
              <span className="auth-checkbox-text">
                Acepto los términos y condiciones
              </span>
            </label>
          )}

          <button className="auth-submit">
            {mode === "signin" ? "Sign In" : "Register"}
          </button>

          {mode === "signin" && (
            <button className="auth-forgot">Forgot password?</button>
          )}
        </div>

        <p className="auth-switch">
          {mode === "signin" ? (
            <>¿No tienes cuenta?{" "}
              <button className="auth-switch-btn" onClick={() => onSwitchMode("register")}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{" "}
              <button className="auth-switch-btn" onClick={() => onSwitchMode("signin")}>
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
