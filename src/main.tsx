import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'
import { ChatBubble } from './features/assistant/components/chat-bubble'
import { installMobileSheets } from './lib/mobile-sheets'

installMobileSheets()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ChatBubble />
  </StrictMode>,
)
