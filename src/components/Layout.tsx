import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAiChat } from '../context/AiChat'
import { useAuth } from '../context/AuthContext'
import AiSidebar from './AiSidebar'

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('clf-c02-theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('clf-c02-theme', theme)
  }, [theme])
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')] as const
}

export default function Layout() {
  const location = useLocation()
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
            <span className="vault-brand__mark" aria-hidden="true"><i /><i /><i /><i /></span>
            <span><strong>CLFVAULT</strong><small>CLF-C02 SYSTEM</small></span>
          </Link>
          <nav className="vault-rail__nav" aria-label="Primary navigation">
            <span className="vault-rail__label">WORKSPACE</span>
            <Link to="/" className={isActive('/')}><span aria-hidden="true">◌</span> Overview</Link>
            <Link to="/domain/1" className={isActive('/domain/1')}><span aria-hidden="true">▤</span> Study notes</Link>
            <Link to="/tracker" className={isActive('/tracker')}><span aria-hidden="true">⌁</span> Course tracker</Link>
            <Link to="/exam" className={isActive('/exam')}><span aria-hidden="true">◎</span> Practice mode</Link>
          </nav>
          <div className="vault-rail__footer">
            <span className="vault-rail__signal"><i /> PROGRESS SYNCED</span>
            <p>Your notes, quiz answers, and course progress are preserved in your study vault.</p>
          </div>
        </aside>
        <div className="vault-main">
          <header className="vault-topbar">
            <div><span className="vault-topbar__eyebrow">AWS CERTIFICATION PATH · CLF-C02</span><strong>Build the system behind your score.</strong></div>
            <div className="vault-topbar__actions">
              <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
              </button>
              {user && (
                <div className="user-menu" ref={menuRef}>
                  <button className="user-menu-trigger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span className="user-menu-avatar">{user.email[0].toUpperCase()}</span>
                    <span className="user-menu-name">{user.email.split('@')[0]}</span>
                    <span className="user-menu-arrow">{menuOpen ? '▲' : '▼'}</span>
                  </button>
                  {menuOpen && (
                    <div className="user-menu-dropdown">
                      <div className="user-menu-header"><span className="user-menu-header-email">{user.email}</span></div>
                      <Link to="/settings" className="user-menu-item">Settings</Link>
                      <button className="user-menu-item user-menu-item-danger" onClick={logout}>Sign out</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>
          <main className="app-container vault-content">
          <Outlet />
        </main>
        <footer className="footer">
          CLFVAULT · AWS Certified Cloud Practitioner CLF-C02 · Target: September 9, 2026
        </footer>
        </div>
      </div>
    </>
  )
}
