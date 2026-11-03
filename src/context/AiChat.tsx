import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { callAiAPI, type AiError } from '../services/aiConfig'
import { getAiSettings } from '../services/api'
import { currentUserId, readUserItem, removeUserItem, TOKEN_KEY, writeUserItem } from '../services/userStorage'

export type AiStatus = 'loading' | 'configured' | 'unconfigured' | 'error'

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
  aiStatus: AiStatus
  aiError: AiError | null
  refreshAiStatus: () => Promise<void>
  dismissAiError: () => void
  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  addConversation: (q: string, a: string) => void
  clearConversations: () => void
  askAI: (question: string) => Promise<boolean>
}

const AiChatContext = createContext<AiChatContextType | null>(null)

const STORAGE_KEY = 'clf-c02-ai-chat'

function loadConversations(): Conversation[] {
  try {
    const saved = readUserItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [chatLoading, setChatLoading] = useState(false)
  const [aiStatus, setAiStatus] = useState<AiStatus>('loading')
  const [aiError, setAiError] = useState<AiError | null>(null)
  const { token, user } = useAuth()
  const statusRequest = useRef(0)

  const refreshAiStatus = useCallback(async () => {
    const request = ++statusRequest.current
    try {
      const settings = await getAiSettings()
      if (request === statusRequest.current) setAiStatus(settings.configured ? 'configured' : 'unconfigured')
    } catch {
      if (request === statusRequest.current) setAiStatus('error')
    }
  }, [])

  const dismissAiError = useCallback(() => setAiError(null), [])

  useEffect(() => {
    statusRequest.current++
    setAiStatus('loading')
    setAiError(null)
    if (token) refreshAiStatus()
  }, [token, refreshAiStatus])

  const persist = useCallback((convs: Conversation[]) => {
    writeUserItem(STORAGE_KEY, JSON.stringify(convs))
  }, [])

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const authToken = () => localStorage.getItem(TOKEN_KEY)

  // The provider outlives sign-out, so each user's conversations are loaded here.
  useEffect(() => {
    setSidebarOpen(false)
    setConversations(user ? loadConversations() : [])
    const token = authToken()
    if (!user || !token) return
    let cancelled = false
    fetch('/api/conversations', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(serverConvs => {
        if (cancelled || !serverConvs || !Array.isArray(serverConvs)) return
        const local = loadConversations()
        const server = serverConvs.map((c: { id: number; question_text: string; answer: string; created_at: string }) => ({
          id: c.id.toString(),
          questionText: c.question_text,
          answer: c.answer,
          timestamp: new Date(c.created_at).getTime(),
        }))
        const merged = [...new Map([...local, ...server].map(c => [c.id, c])).values()]
          .sort((a, b) => a.timestamp - b.timestamp)
        writeUserItem(STORAGE_KEY, JSON.stringify(merged))
        setConversations(merged)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

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
    removeUserItem(STORAGE_KEY)
  }, [])

  const askAI = useCallback(async (questionText: string) => {
    setChatLoading(true)
    setAiError(null)
    const prompt = `You are an AWS CLF-C02 exam tutor. Answer the following question clearly and concisely, with specific AWS services and concepts.

${questionText}`
    const owner = currentUserId()
    const result = await callAiAPI(prompt)
    if (currentUserId() !== owner) {
      setChatLoading(false)
      return false
    }
    if (result.ok) addConversation(questionText, result.answer)
    else setAiError({ code: result.code, message: result.message })
    setChatLoading(false)
    return result.ok
  }, [addConversation])

  return (
    <AiChatContext.Provider value={{
      sidebarOpen, conversations, chatLoading, aiStatus, aiError,
      refreshAiStatus, dismissAiError,
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
