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
    <div>
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>

      <div className="domain-detail-header">
        <h1>Domain {domain.id} — {domain.title}</h1>
        <div className="domain-detail-meta">
          <span className="domain-detail-meta-item">
            📊 Weight: <strong>{domain.weight}%</strong>
          </span>
          <span className="domain-detail-meta-item">
            <span className={`badge ${statusClass}`}>{statusLabel}</span>
          </span>
          <span className="domain-detail-meta-item">
            🎯 Mastery: <strong>{domain.mastery}%</strong>
          </span>
        </div>
        <div className="progress-bar" style={{ marginTop: 12, maxWidth: 400 }}>
          <div className="progress-bar-fill" style={{ width: `${domain.mastery}%`, background: domain.color }} />
        </div>
      </div>

      <div className="domain-detail-meta" style={{ marginBottom: 24 }}>
        <span className="domain-detail-meta-item">Next topic: <strong>{domain.nextTopic}</strong></span>
      </div>

      <div className="service-tags" style={{ marginBottom: 32 }}>
        {domain.keyServices.map((s) => (
          <span key={s} className="service-tag">{s}</span>
        ))}
      </div>

      {domain.subNotes.map((note) => (
        <div key={note.id} className="card subnote-card">
          <h3>
            {note.title}
            <span className={`badge ${note.status === 'in-progress' ? 'badge-in-progress' : note.status === 'complete' ? 'badge-complete' : 'badge-not-started'}`}>
              {note.status === 'in-progress' ? 'In Progress' : note.status === 'complete' ? 'Complete' : 'Not Started'}
            </span>
          </h3>

          {note.content.map((section, i) => (
            <div key={i} className="content-section">
              <h4>{section.section}</h4>
              <ul>
                {section.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
