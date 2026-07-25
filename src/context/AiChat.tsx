import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { callAiAPI } from '../services/aiConfig'

export interface Conversation {
  id: string
  questionText: string
  answer: string
  timestamp: number
}

interface AiChatContextType {
  sidebarOpen: boolean
  conversations: Conversation[]
  chatLoading: boolean
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  addConversation: (q: string, a: string) => void
  clearConversations: () => void
  askAI: (question: string) => Promise<void>
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
  const [chatLoading, setChatLoading] = useState(false)

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
          .sort((a, b) => a.timestamp - b.timestamp)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        setConversations(merged)
      })
      .catch(() => {})
  }, [])

  const addConversation = useCallback((questionText: string, answer: string) => {
    const token = authToken()
    const localId = 'local-' + Date.now().toString()

    if (token) {
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question_text: questionText, answer }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(serverConv => {
          if (serverConv?.id) {
            setConversations(prev => {
              const updated = prev.map(c =>
                c.id === localId ? { ...c, id: serverConv.id.toString() } : c
              )
              persist(updated)
              return updated
            })
          }
        })
        .catch(() => {})
    }

    setConversations(prev => {
      const next: Conversation[] = [
        ...prev,
        { id: localId, questionText, answer, timestamp: Date.now() },
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

  const askAI = useCallback(async (questionText: string) => {
    setChatLoading(true)
    const prompt = `You are an AWS CLF-C02 exam tutor. Answer the following question clearly and concisely, with specific AWS services and concepts.

${questionText}`
    const answer = await callAiAPI(prompt)
    if (answer) addConversation(questionText, answer)
    setChatLoading(false)
  }, [addConversation])

  return (
    <AiChatContext.Provider value={{
      sidebarOpen, conversations, chatLoading,
      toggleSidebar, openSidebar, closeSidebar,
      addConversation, clearConversations, askAI,
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
