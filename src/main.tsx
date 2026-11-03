import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AiChatProvider } from './context/AiChat'
import { AuthProvider } from './context/AuthContext'
import { purgeLegacyAiStorage } from './services/aiConfig'
import './styles.css'

purgeLegacyAiStorage()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AiChatProvider>
          <App />
        </AiChatProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
