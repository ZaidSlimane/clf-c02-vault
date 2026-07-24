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
    setConversations(prev => {
      const next: Conversation[] = [
        ...prev,
        { id: 'local-' + Date.now().toString(), questionText, answer, timestamp: Date.now() },
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
    let key = localStorage.getItem('dahl_api_key')
    if (!key) {
      const entered = window.prompt('Enter your Dahl API key to use AI explanations:')
      if (!entered) return
      key = entered
      localStorage.setItem('dahl_api_key', key)
    }

    setChatLoading(true)
    const prompt = `You are an AWS CLF-C02 exam tutor. Answer the following question clearly and concisely, with specific AWS services and concepts.

${questionText}`

    try {
      const res = await fetch('https://inference.dahl.global/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'moonshotai/Kimi-K2.6',
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        addConversation(questionText, `API Error (${res.status}): ${data.error?.message || JSON.stringify(data).slice(0, 300)}`)
      } else {
        const answer = data.choices?.[0]?.message?.content || 'No response from AI'
        addConversation(questionText, answer)
      }
    } catch (err) {
      addConversation(questionText, `Network error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setChatLoading(false)
    }
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
