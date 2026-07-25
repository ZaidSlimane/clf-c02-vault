import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAiChat } from '../context/AiChat'
import { useAuth } from '../context/AuthContext'
import AiSidebar from './AiSidebar'

export default function Layout() {
  const location = useLocation()
  const { sidebarOpen } = useAiChat()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isActive = (path: string) => location.pathname === path ? 'active' : ''

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
      <div className={`app-wrapper ${sidebarOpen ? 'app-wrapper-sidebar-open' : ''}`}>
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="header-logo">
              <span className="header-logo-icon">☁️</span>
              CLF-C02 Dashboard
            </Link>
            <nav className="header-nav">
              <Link to="/" className={isActive('/')}>Dashboard</Link>
              <Link to="/tracker" className={isActive('/tracker')}>Tracker</Link>
              <Link to="/exam" className={isActive('/exam')}>Exam</Link>
              {user && (
                <div className="user-menu" ref={menuRef}>
                  <button className="user-menu-trigger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span className="user-menu-avatar">{user.email[0].toUpperCase()}</span>
                    <span className="user-menu-name">{user.email.split('@')[0]}</span>
                    <span className="user-menu-arrow">{menuOpen ? '▲' : '▼'}</span>
                  </button>
                  {menuOpen && (
                    <div className="user-menu-dropdown">
                      <div className="user-menu-header">
                        <span className="user-menu-header-email">{user.email}</span>
                      </div>
                      <Link to="/settings" className="user-menu-item">⚙️ Settings</Link>
                      <button className="user-menu-item user-menu-item-danger" onClick={logout}>🚪 Sign Out</button>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </header>
        <main className="app-container">
          <Outlet />
        </main>
        <footer className="footer">
          AWS Certified Cloud Practitioner CLF-C02 &middot; Target: September 9, 2026
        </footer>
      </div>
    </>
  )
}
