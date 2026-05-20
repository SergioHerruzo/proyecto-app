import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
} from "amazon-cognito-identity-js"

const userPool = new CognitoUserPool({
  UserPoolId: "us-east-1_QcUGOhJYI",
  ClientId: "7vjudsjeu488764orqv7oka5af",
})

export interface AuthUser {
  username: string
  email: string
  accessToken: string
}

// --- Login ---

export function login(identifier: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: identifier, Pool: userPool })
    const authDetails = new AuthenticationDetails({ Username: identifier, Password: password })

    user.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const payload = session.getIdToken().payload
        const username = (payload["cognito:username"] as string | undefined) ?? identifier
        const email = (payload.email as string | undefined) ?? ""
        resolve({
          username,
          email,
          accessToken: session.getAccessToken().getJwtToken(),
        })
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () => reject(new Error("Se requiere cambiar la contraseña.")),
    })
  })
}

// --- Register ---

export function register(username: string, email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const attributes = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
      new CognitoUserAttribute({ Name: "preferred_username", Value: username }),
    ]

    userPool.signUp(username, password, attributes, [], (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// --- Confirm registration ---

export function confirmRegister(username: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool })
    user.confirmRegistration(code, true, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// --- Resend confirmation code ---

export function resendConfirmationCode(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: username, Pool: userPool })
    user.resendConfirmationCode((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// --- Logout ---

export function logout(): void {
  userPool.getCurrentUser()?.signOut()
}

// --- Restore session on page load ---

export function restoreSession(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser()
    if (!user) return resolve(null)

    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) return resolve(null)
      const payload = session.getIdToken().payload
      const username = (payload["cognito:username"] as string | undefined) ?? user.getUsername()
      const email = (payload.email as string | undefined) ?? ""
      resolve({
        username,
        email,
        accessToken: session.getAccessToken().getJwtToken(),
      })
    })
  })
}
