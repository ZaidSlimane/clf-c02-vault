import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getDomain } from '../data/domains'
import { domainProgress, domainTopics, toggleTopic, useCheckedTopics } from '../services/topicProgress'

export default function DomainPage() {
  const { domainId, subNoteId } = useParams<{ domainId: string; subNoteId?: string }>()
  const domain = getDomain(domainId || '')
  const checked = useCheckedTopics()

  useEffect(() => { window.scrollTo(0, 0) }, [domainId, subNoteId])

  if (!domain) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <h2>Domain not found</h2>
        <Link to="/" className="back-link" style={{ justifyContent: 'center', marginTop: 16 }}>&larr; Back to Dashboard</Link>
      </div>
    )
  }

  const progress = domainProgress(domain, checked)

  const statusLabel =
    progress.status === 'in-progress' ? 'In Progress' :
    progress.status === 'complete' ? 'Complete' : 'Not Started'

  const statusClass =
    progress.status === 'in-progress' ? 'badge-in-progress' :
    progress.status === 'complete' ? 'badge-complete' : 'badge-not-started'

  const topics = domainTopics(domain)
  const requested = Number(subNoteId)
  const index = requested >= 1 && requested <= topics.length ? requested - 1 : 0
  const topic = topics[index]
  const topicPath = (position: number) => `/domain/${domain.id}/${position + 1}`

  return (
    <div className="vault-study-page">
      <Link to="/" className="back-link">← Return to overview</Link>
      <section className="vault-study-hero">
        <div>
          <span className="vault-eyebrow">STUDY NOTES · DOMAIN {String(domain.id).padStart(2, '0')}</span>
          <h1>{domain.title}</h1>
          <p>One topic at a time. Practice when the concept feels precise.</p>
          <div className="vault-study-meta"><span>EXAM WEIGHT <strong>{domain.weight}%</strong></span><span className={`badge ${statusClass}`}>{statusLabel}</span></div>
        </div>
        <aside className="vault-study-hero__signal">
          <span className="vault-eyebrow">MASTERY SIGNAL</span>
          <strong>{progress.mastery}<em>%</em></strong>
          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${progress.mastery}%` }} /></div>
          <p>{progress.done} of {progress.total} topics. Next: <b>{progress.nextTopic}</b></p>
        </aside>
      </section>
      <div className="vault-study-layout">
        <aside className="vault-study-sidecar">
          <span className="vault-eyebrow">Topics</span>
          <nav className="note-list" aria-label={`${domain.title} topics`}>
            {topics.map((t, i) => (
              <Link key={i} to={topicPath(i)} className={i === index ? 'active' : ''} aria-current={i === index ? 'page' : undefined}>
                <span className={`answer-bubble ${checked.includes(t.key) ? 'answer-bubble--checked' : ''}`} aria-hidden="true">{checked.includes(t.key) ? '✓' : i + 1}</span>
                <span>{t.section}{checked.includes(t.key) && <span className="sr-only"> (checked)</span>}</span>
              </Link>
            ))}
          </nav>
          <span className="vault-eyebrow">KEY SERVICES</span>
          <div className="service-tags">{domain.keyServices.map((s) => <span key={s} className="service-tag">{s}</span>)}</div>
          <Link to="/exam" className="vault-button vault-button--primary">Practice this domain</Link>
        </aside>
        <div className="vault-study-cards">
          {topic && (
            <article className="card subnote-card">
              <div className="subnote-card__topline"><span className="vault-eyebrow">Topic {index + 1} of {topics.length} · {topic.noteTitle}</span></div>
              <h3>{topic.section}</h3>
              <div className="content-section"><ul>{topic.items.map((item, j) => <li key={j}>{item}</li>)}</ul></div>
              <label className="topic-check">
                <input type="checkbox" checked={checked.includes(topic.key)} onChange={() => toggleTopic(topic.key)} />
                <span>I understand this topic</span>
              </label>
              <div className="note-pager">
                {index > 0 ? <Link to={topicPath(index - 1)} className="vault-button vault-button--quiet">Previous topic</Link> : <span />}
                {index < topics.length - 1
                  ? <Link to={topicPath(index + 1)} className="vault-button vault-button--primary">Next topic</Link>
                  : <Link to="/exam" className="vault-button vault-button--primary">Practice this domain</Link>}
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
