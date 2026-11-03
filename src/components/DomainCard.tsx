import { Link } from 'react-router-dom'
import type { Domain } from '../data/domains'
import { domainProgress, useCheckedTopics } from '../services/topicProgress'

interface Props {
  domain: Domain
}

export default function DomainCard({ domain }: Props) {
  const progress = domainProgress(domain, useCheckedTopics())
  const statusLabel =
    progress.status === 'in-progress' ? 'In progress' :
    progress.status === 'complete' ? 'Complete' : 'Not started'

  const statusClass =
    progress.status === 'in-progress' ? 'badge-in-progress' :
    progress.status === 'complete' ? 'badge-complete' : 'badge-not-started'

  return (
    <div className="card domain-card">
      <div>
        <div className="domain-card-header">
          <div className="domain-card-title"><span className="answer-bubble" aria-hidden="true">{domain.id}</span> {domain.title}</div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="domain-card-body">
          <div className="domain-card-row">
            <span className="domain-card-label">Weight</span>
            <span className="domain-card-value">{domain.weight}% of exam</span>
          </div>
          <div className="domain-card-row">
            <span className="domain-card-label">Mastery</span>
            <span className="domain-card-value">{progress.mastery}% · {progress.done} of {progress.total} topics</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress.mastery}%` }} />
          </div>
          <div className="domain-card-row">
            <span className="domain-card-label">Next topic</span>
            <span className="domain-card-value">{progress.nextTopic}</span>
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
          <Link to={`/domain/${domain.id}`}>Open note</Link>
        </div>
      </div>
    </div>
  )
}
