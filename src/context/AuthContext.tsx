import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { readSession, sessionChangedForTab, TOKEN_KEY, USER_KEY } from '../services/userStorage'

interface User { id: number; email: string }

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readSession)
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null)

  const saveSession = (t: string, u: User) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  // A reload drops everything this tab holds in memory for the previous account.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (sessionChangedForTab(event.key, user?.id ?? null)) window.location.reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user?.id])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    saveSession(data.token, data.user)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    saveSession(data.token, data.user)
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading: false, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
