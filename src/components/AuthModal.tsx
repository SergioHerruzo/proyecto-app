import '../styles/AuthModal.css'
import { useState } from "react"
import { Check, Circle } from "lucide-react"
import { login, register, confirmRegister, resendConfirmationCode } from "../services/auth"
import type { AuthUser } from "../services/auth"

type AuthMode = "signin" | "register"

interface AuthModalProps {
  mode: AuthMode
  onClose: () => void
  onSwitchMode: (mode: AuthMode) => void
  onAuthSuccess: (user: AuthUser) => void
}

interface PasswordRules {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  number: boolean
  special: boolean
}

function checkPassword(password: string): PasswordRules {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
}

function isPasswordValid(rules: PasswordRules): boolean {
  return Object.values(rules).every(Boolean)
}

function RuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li style={{
      color: ok ? "#4caf50" : "#888",
      fontSize: "0.8rem",
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      listStyle: "none",
    }}>
      {ok ? <Check size={12} /> : <Circle size={12} />}
      {text}
    </li>
  )
}

export default function AuthModal({ mode, onClose, onSwitchMode, onAuthSuccess }: AuthModalProps) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [confirmCode, setConfirmCode] = useState("")
  const [resendCooldown, setResendCooldown] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const passwordRules = checkPassword(password)

  const handleSubmit = async () => {
    setError(null)

    if (mode === "signin") {
      if (!email.trim() || !password.trim()) {
        setError("Introduce tu correo o usuario y contraseña.")
        return
      }
    } else {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError("Por favor completa todos los campos.")
        return
      }
      if (!isPasswordValid(passwordRules)) {
        setError("La contraseña no cumple los requisitos.")
        return
      }
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.")
        return
      }
      if (!acceptTerms) {
        setError("Debes aceptar los términos y condiciones.")
        return
      }
    }

    setLoading(true)
    try {
      if (mode === "signin") {
        const user = await login(email, password)
        onAuthSuccess(user)
      } else {
        await register(username, email, password)
        setStep("confirm")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes("UserNotFoundException") || message.includes("NotAuthorizedException")) {
        setError("Correo, usuario o contraseña incorrectos.")
      } else if (message.includes("UsernameExistsException")) {
        setError("Ya existe una cuenta con ese nombre de usuario.")
      } else if (message.includes("InvalidPasswordException")) {
        setError("La contraseña no cumple los requisitos de seguridad.")
      } else if (message.includes("InvalidParameterException")) {
        setError("El formato del email no es válido.")
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetFields = () => {
    setUsername("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setAcceptTerms(false)
    setConfirmCode("")
    setStep("form")
    setError(null)
  }

  const handleConfirm = async () => {
    setError(null)
    if (!confirmCode.trim()) {
      setError("Introduce el código de verificación.")
      return
    }
    setLoading(true)
    try {
      await confirmRegister(username, confirmCode)
      resetFields()
      onSwitchMode("signin")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes("CodeMismatchException")) {
        setError("Código incorrecto. Comprueba tu email.")
      } else if (message.includes("ExpiredCodeException")) {
        setError("El código ha expirado. Solicita uno nuevo.")
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setResendCooldown(true)
    try {
      await resendConfirmationCode(username)
    } catch {
      setError("No se pudo reenviar el código. Inténtalo más tarde.")
    }
    setTimeout(() => setResendCooldown(false), 30000)
  }

  if (step === "confirm") {
    return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()}>
          <button className="friend-modal-close" onClick={onClose}>✕</button>
          <h2 className="auth-title">Verifica tu cuenta</h2>
          <div className="auth-form">
            <p style={{ color: "#aaa", fontSize: "0.9rem", textAlign: "center", marginBottom: "1.5rem" }}>
              Hemos enviado un código de 6 dígitos a <strong style={{ color: "#ddd" }}>{email}</strong>. Introdúcelo para activar tu cuenta.
            </p>

            <div className="auth-field">
              <label className="auth-label">Código de verificación</label>
              <input
                type="text"
                className="auth-input"
                placeholder="123456"
                value={confirmCode}
                onChange={e => { setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleConfirm()}
                disabled={loading}
                maxLength={6}
                style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.2rem" }}
              />
            </div>

            {error && (
              <p style={{ color: "#f44336", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
                {error}
              </p>
            )}

            <button className="auth-submit" onClick={handleConfirm} disabled={loading}>
              {loading ? "..." : "Verificar cuenta"}
            </button>

            <button
              className="auth-forgot"
              onClick={handleResend}
              disabled={resendCooldown || loading}
            >
              {resendCooldown ? "Código reenviado (espera 30s)" : "Reenviar código"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="friend-modal-close" onClick={onClose}>✕</button>

        <h2 className="auth-title">
          {mode === "signin" ? "Iniciar sesión" : "Registro"}
        </h2>

        <div className="auth-form">

          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Usuario</label>
              <input
                type="text"
                className="auth-input"
                placeholder="nombre_usuario"
                value={username}
                onChange={e => { setUsername(e.target.value.replace(/\s/g, "")); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                disabled={loading}
              />
            </div>
          )}

          {mode === "signin" ? (
            <div className="auth-field">
              <label className="auth-label">Correo o usuario</label>
              <input
                type="text"
                className="auth-input"
                placeholder="tu@email.com o nombre_usuario"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                disabled={loading}
              />
            </div>
          ) : (
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input
                type="text"
                className="auth-input"
                placeholder="tu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              disabled={loading}
            />
            {mode === "register" && (passwordFocused || password.length > 0) && (
              <ul style={{ margin: "0.5rem 0 0", padding: 0 }}>
                <RuleItem ok={passwordRules.minLength} text="Mínimo 8 caracteres" />
                <RuleItem ok={passwordRules.uppercase} text="Al menos una mayúscula (A-Z)" />
                <RuleItem ok={passwordRules.lowercase} text="Al menos una minúscula (a-z)" />
                <RuleItem ok={passwordRules.number} text="Al menos un número (0-9)" />
                <RuleItem ok={passwordRules.special} text="Al menos un carácter especial (!@#$...)" />
              </ul>
            )}
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label className="auth-label">Repetir password</label>
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                disabled={loading}
                style={confirmPassword.length > 0
                  ? { borderColor: confirmPassword === password ? "#4caf50" : "#f44336" }
                  : {}
                }
              />
            </div>
          )}

          {mode === "register" && (
            <label className="auth-checkbox-label">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                disabled={loading}
              />
              <span className="auth-checkbox-text">
                Acepto los términos y condiciones
              </span>
            </label>
          )}

          {error && (
            <p style={{ color: "#f44336", fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            onClick={handleSubmit}
            disabled={loading || (mode === "register" && (!isPasswordValid(passwordRules) || password !== confirmPassword))}
          >
            {loading ? "..." : mode === "signin" ? "Iniciar sesión" : "Registrarse"}
          </button>

          {mode === "signin" && (
            <button className="auth-forgot" disabled={loading}>
              Forgot password?
            </button>
          )}
        </div>

        <p className="auth-switch">
          {mode === "signin" ? (
            <>¿No tienes cuenta?{" "}
              <button className="auth-switch-btn" onClick={() => { resetFields(); onSwitchMode("register") }}>
                Regístrate
              </button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{" "}
              <button className="auth-switch-btn" onClick={() => { resetFields(); onSwitchMode("signin") }}>
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
