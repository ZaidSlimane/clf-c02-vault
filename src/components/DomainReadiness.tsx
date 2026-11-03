import { domains } from '../data/domains'

/** Exam blueprint: each segment is sized by domain weight and filled by mastery. */
export default function DomainReadiness() {
  const readiness = Math.round(domains.reduce((sum, d) => sum + (d.weight * d.mastery) / 100, 0))

  return (
    <div className="domain-readiness">
      <div className="domain-readiness__summary">
        <strong>{readiness}%</strong>
        <span>of the exam blueprint mastered</span>
      </div>
      <div className="domain-readiness__bar" role="img" aria-label={`${readiness}% of the exam blueprint mastered`}>
        {domains.map((d) => (
          <div key={d.id} className="domain-readiness__segment" style={{ flexGrow: d.weight }}>
            <div className="domain-readiness__fill" style={{ width: `${d.mastery}%` }} />
          </div>
        ))}
      </div>
      <div className="domain-readiness__legend">
        {domains.map((d) => (
          <div key={d.id} className="domain-readiness__label" style={{ flexGrow: d.weight }}>
            <span className="answer-bubble" aria-hidden="true">{d.id}</span>
            <span>{d.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
