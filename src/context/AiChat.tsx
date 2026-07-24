import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

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

  const addConversation = useCallback((questionText: string, answer: string) => {
    setConversations(prev => {
      const next: Conversation[] = [
        { id: Date.now().toString(), questionText, answer, timestamp: Date.now() },
        ...prev,
      ]
      persist(next)
      return next
    })
  }, [persist])

  const clearConversations = useCallback(() => {
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
