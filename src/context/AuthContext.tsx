import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { readSession, restoredWithStaleSession, sealLegacyKeys, sessionChangedForTab, TOKEN_KEY, USER_KEY, type SessionUser as User } from '../services/userStorage'

export interface Registration {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (details: Registration) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialSession] = useState(readSession)
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null)
  const [token, setToken] = useState<string | null>(initialSession?.token ?? null)

  const saveSession = (t: string, u: User) => {
    sealLegacyKeys()
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
    const onPageShow = (event: PageTransitionEvent) => {
      if (restoredWithStaleSession(event.persisted, user?.id ?? null)) window.location.reload()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [user?.id])

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    saveSession(data.token, data.user)
  }, [])

  const register = useCallback(async (details: Registration) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
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
