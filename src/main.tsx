import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'; // Ajusta la ruta si es necesario
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
