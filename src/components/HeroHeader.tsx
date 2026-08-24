import { Link } from 'react-router-dom'

/** Signal Deck overview hero — current standing and next action remain the visual focal point. */
export default function HeroHeader() {
  const target = new Date('2026-09-09')
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <section className="vault-hero">
      <div className="vault-hero__copy">
        <span className="vault-eyebrow">CURRENT FLIGHT PLAN · CLF-C02</span>
        <h1>Build judgment,<br /><em>not just recall.</em></h1>
        <p>Organize your notes, track the course, and rehearse exam decisions from one focused certification workspace.</p>
        <div className="vault-hero__actions">
          <Link to="/exam" className="vault-button vault-button--primary">Resume practice <span>→</span></Link>
          <Link to="/tracker" className="vault-button vault-button--quiet">Open course tracker</Link>
        </div>
        <div className="vault-route" aria-label="Study route progress"><span>ROUTE / ACTIVE</span><i /><i /><i /><i /><i /></div>
      </div>
      <aside className="vault-hero__waypoint">
        <span className="vault-eyebrow">EXAM WAYPOINT</span>
        <strong>{diff > 0 ? `${diff} DAYS` : 'EXAM DAY'}</strong>
        <span>until September 9, 2026</span>
        <div className="vault-hero__rule" />
        <p>One focused session today moves the route forward.</p>
      </aside>
    </section>
  )
}
