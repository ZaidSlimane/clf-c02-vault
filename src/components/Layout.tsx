import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAiChat } from '../context/AiChat'
import { useAuth } from '../context/AuthContext'
import AiSidebar from './AiSidebar'
import { formatExamDate, useExamDate } from '../services/examDate'

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('clf-c02-theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('clf-c02-theme', theme)
  }, [theme])
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')] as const
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/domain')) return 'Study notes'
  if (pathname === '/tracker') return 'Course tracker'
  if (pathname === '/exam') return 'Practice mode'
  if (pathname === '/settings') return 'Settings'
  return 'Overview'
}

export default function Layout() {
  const location = useLocation()
  const examDate = useExamDate()
  const { sidebarOpen } = useAiChat()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isActive = (path: string) => (
    path === '/domain/1'
      ? location.pathname.startsWith('/domain')
      : location.pathname === path
  ) ? 'active' : ''
  const [theme, toggleTheme] = useTheme()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location])

  return (
    <>
      <AiSidebar />
      <div className={`app-wrapper vault-shell ${sidebarOpen ? 'app-wrapper-sidebar-open' : ''}`}>
        <aside className="vault-rail">
          <Link to="/" className="vault-brand" aria-label="CLF Vault overview">
            <span><strong>CLF Vault</strong><small>CLF-C02</small></span>
          </Link>
          <nav className="vault-rail__nav" aria-label="Primary navigation">
            <Link to="/" className={isActive('/')}>Overview</Link>
            <Link to="/domain/1" className={isActive('/domain/1')}>Study notes</Link>
            <Link to="/tracker" className={isActive('/tracker')}>Course tracker</Link>
            <Link to="/exam" className={isActive('/exam')}>Practice mode</Link>
          </nav>
          {user && (
            <div className="user-menu" ref={menuRef}>
              {menuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header"><span className="user-menu-header-email">{user.email}</span></div>
                  <Link to="/settings" className="user-menu-item">Settings</Link>
                  <button className="user-menu-item user-menu-item-danger" onClick={logout}>Sign out</button>
                </div>
              )}
              <button className="user-menu-trigger" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Account menu">
                <span className="user-menu-avatar">{(user.username ?? user.email)[0].toUpperCase()}</span>
                <span className="user-menu-name">{user.username ?? user.email.split('@')[0]}</span>
                <span className="user-menu-arrow">{menuOpen ? '▼' : '▲'}</span>
              </button>
            </div>
          )}
        </aside>
        <div className="vault-main">
          <header className="vault-topbar">
            <strong>{pageTitle(location.pathname)}</strong>
            <div className="vault-topbar__actions">
              <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </header>
          <main className="app-container vault-content">
          <Outlet />
        </main>
        <footer className="footer">
          CLF Vault · AWS Certified Cloud Practitioner CLF-C02{examDate ? ` · Exam ${formatExamDate(examDate)}` : ''}
        </footer>
        </div>
      </div>
    </>
  )
}
