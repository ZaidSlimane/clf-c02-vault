import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAiChat } from '../context/AiChat'
import AiSidebar from './AiSidebar'

export default function Layout() {
  const location = useLocation()
  const { sidebarOpen } = useAiChat()
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
