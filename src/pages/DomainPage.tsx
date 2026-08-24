import { useParams, Link } from 'react-router-dom'
import { getDomain } from '../data/domains'

export default function DomainPage() {
  const { domainId } = useParams<{ domainId: string; subNoteId?: string }>()
  const domain = getDomain(domainId || '')

  if (!domain) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2>Domain not found</h2>
        <Link to="/" className="back-link" style={{ justifyContent: 'center', marginTop: 16 }}>&larr; Back to Dashboard</Link>
      </div>
    )
  }

  const statusLabel =
    domain.status === 'in-progress' ? 'In Progress' :
    domain.status === 'complete' ? 'Complete' : 'Not Started'

  const statusClass =
    domain.status === 'in-progress' ? 'badge-in-progress' :
    domain.status === 'complete' ? 'badge-complete' : 'badge-not-started'

  return (
    <div className="vault-study-page">
      <Link to="/" className="back-link">← Return to overview</Link>
      <section className="vault-study-hero">
        <div>
          <span className="vault-eyebrow">STUDY NOTES · DOMAIN {String(domain.id).padStart(2, '0')}</span>
          <h1>{domain.title}</h1>
          <p>Use the cards below to deepen recall, then move into practice when the concept feels precise.</p>
          <div className="vault-study-meta"><span>EXAM WEIGHT <strong>{domain.weight}%</strong></span><span className={`badge ${statusClass}`}>{statusLabel}</span></div>
        </div>
        <aside className="vault-study-hero__signal">
          <span className="vault-eyebrow">MASTERY SIGNAL</span>
          <strong>{domain.mastery}<em>%</em></strong>
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${domain.mastery}%`, background: domain.color }} /></div>
          <p>Next: <b>{domain.nextTopic}</b></p>
        </aside>
      </section>
      <div className="vault-study-layout">
        <aside className="vault-study-sidecar">
          <span className="vault-eyebrow">KEY SERVICES</span>
          <div className="service-tags">{domain.keyServices.map((s) => <span key={s} className="service-tag">{s}</span>)}</div>
          <Link to="/exam" className="vault-button vault-button--primary">Practice this domain <span>→</span></Link>
        </aside>
        <div className="vault-study-cards">
          {domain.subNotes.map((note, index) => (
            <article key={note.id} className="card subnote-card">
              <div className="subnote-card__topline"><span className="vault-eyebrow">NOTE {String(index + 1).padStart(2, '0')}</span><span className={`badge ${note.status === 'in-progress' ? 'badge-in-progress' : note.status === 'complete' ? 'badge-complete' : 'badge-not-started'}`}>{note.status === 'in-progress' ? 'In Progress' : note.status === 'complete' ? 'Complete' : 'Not Started'}</span></div>
              <h3>{note.title}</h3>
              {note.content.map((section, i) => (
                <div key={i} className="content-section"><h4>{section.section}</h4><ul>{section.items.map((item, j) => <li key={j}>{item}</li>)}</ul></div>
              ))}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
