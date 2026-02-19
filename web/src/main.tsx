import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Amplify } from 'aws-amplify'
import { cognitoConfig } from './config/cognito'
import { configureAPI } from '@indiegames-app/shared'

// Configurar Amplify Auth
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolWebClientId,
      loginWith: {
        oauth: {
          domain: `cognito-idp.${cognitoConfig.region}.amazonaws.com`,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_URI],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_URI],
          responseType: 'code',
        }
      }
    }
  }
})

// Configurar API
configureAPI(import.meta.env.VITE_API_BASE_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
