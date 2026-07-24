import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path ? 'active' : ''

  return (
    <>
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
    </>
  )
}
