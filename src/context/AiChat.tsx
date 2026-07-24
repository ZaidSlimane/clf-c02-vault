import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface Conversation {
  id: string
  questionText: string
  answer: string
  timestamp: number
}

interface AiChatContextType {
  sidebarOpen: boolean
  conversations: Conversation[]
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  addConversation: (q: string, a: string) => void
  clearConversations: () => void
}

const AiChatContext = createContext<AiChatContextType | null>(null)

const STORAGE_KEY = 'clf-c02-ai-chat'

function loadConversations(): Conversation[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)

  const persist = useCallback((convs: Conversation[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs))
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const authToken = () => localStorage.getItem('clf-c02-auth-token')

  useEffect(() => {
    const token = authToken()
    if (!token) return
    fetch('/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(serverConvs => {
        if (!serverConvs || !Array.isArray(serverConvs)) return
        const local = loadConversations()
        const server = serverConvs.map((c: { id: number; question_text: string; answer: string; created_at: string }) => ({
          id: c.id.toString(),
          questionText: c.question_text,
          answer: c.answer,
          timestamp: new Date(c.created_at).getTime(),
        }))
        const merged = [...new Map([...local, ...server].map(c => [c.id, c])).values()]
          .sort((a, b) => b.timestamp - a.timestamp)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        setConversations(merged)
      })
      .catch(() => {})
  }, [])

  const addConversation = useCallback((questionText: string, answer: string) => {
    const token = authToken()
    if (token) {
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question_text: questionText, answer }),
      }).catch(() => {})
    }
    setConversations(prev => {
      const next: Conversation[] = [
        { id: 'local-' + Date.now().toString(), questionText, answer, timestamp: Date.now() },
        ...prev,
      ]
      persist(next)
      return next
    })
  }, [persist])

  const clearConversations = useCallback(() => {
    const token = authToken()
    if (token) {
      fetch('/api/conversations', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
        .catch(() => {})
    }
    setConversations([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AiChatContext.Provider value={{
      sidebarOpen, conversations,
      toggleSidebar, openSidebar, closeSidebar,
      addConversation, clearConversations,
    }}>
      {children}
    </AiChatContext.Provider>
  )
}

export function useAiChat() {
  const ctx = useContext(AiChatContext)
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider')
  return ctx
}
