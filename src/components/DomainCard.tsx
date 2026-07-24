import { Link } from 'react-router-dom'
import type { Domain } from '../data/domains'

interface Props {
  domain: Domain
}

export default function DomainCard({ domain }: Props) {
  const statusLabel =
    domain.status === 'in-progress' ? 'In Progress' :
    domain.status === 'complete' ? 'Complete' : 'Not Started'

  const statusClass =
    domain.status === 'in-progress' ? 'badge-in-progress' :
    domain.status === 'complete' ? 'badge-complete' : 'badge-not-started'

  return (
    <div className="card domain-card">
      <div className="domain-card-accent" style={{ background: domain.color }} />
      <div style={{ paddingLeft: 8 }}>
        <div className="domain-card-header">
          <div className="domain-card-title">Domain {domain.id} — {domain.title}</div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="domain-card-body">
          <div className="domain-card-row">
            <span className="domain-card-label">Weight</span>
            <span className="domain-card-value">{domain.weight}% of exam</span>
          </div>
          <div className="domain-card-row">
            <span className="domain-card-label">Mastery</span>
            <span className="domain-card-value">{domain.mastery}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${domain.mastery}%`, background: domain.color }} />
          </div>
          <div className="domain-card-row">
            <span className="domain-card-label">Next topic</span>
            <span className="domain-card-value">{domain.nextTopic}</span>
          </div>
          <div className="domain-card-row">
            <span className="domain-card-label">Key services</span>
            <span className="domain-card-value">
              <span className="service-tags">
                {domain.keyServices.map((s) => (
                  <span key={s} className="service-tag">{s}</span>
                ))}
              </span>
            </span>
          </div>
        </div>

        <div className="domain-card-link">
          <Link to={`/domain/${domain.id}`}>Open note &rarr;</Link>
        </div>
      </div>
    </div>
  )
}
