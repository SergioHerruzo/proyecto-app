import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css'
import { GameCatalog } from './components/GameCatalog';

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div>
          <header style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
            <h1>Bienvenido {user?.username}</h1>
            <button onClick={signOut}>Cerrar Sesión</button>
          </header>
          <GameCatalog />
        </div>
      )}
    </Authenticator>
  )
}

export default App
