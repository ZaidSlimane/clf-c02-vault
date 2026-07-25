import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAiChat } from '../context/AiChat'
import { useAuth } from '../context/AuthContext'
import AiSidebar from './AiSidebar'

export default function Layout() {
  const location = useLocation()
  const { sidebarOpen } = useAiChat()
  const { user, logout } = useAuth()
  const isActive = (path: string) => location.pathname === path ? 'active' : ''

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
                <span className="header-user">
                  <span className="header-user-email">{user.email}</span>
                  <button className="header-logout" onClick={logout}>Sign Out</button>
                </span>
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
