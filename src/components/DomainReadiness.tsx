import { domains } from '../data/domains'
import { domainProgress, useCheckedTopics } from '../services/topicProgress'

/** Exam blueprint: each segment is sized by domain weight and filled by mastery. */
export default function DomainReadiness() {
  const checked = useCheckedTopics()
  const mastery = (id: string) => domainProgress(domains.find((d) => d.id === id)!, checked).mastery
  const readiness = Math.round(domains.reduce((sum, d) => sum + (d.weight * mastery(d.id)) / 100, 0))

  return (
    <div className="domain-readiness">
      <div className="domain-readiness__summary">
        <strong>{readiness}%</strong>
        <span>of the exam blueprint mastered</span>
      </div>
      <div className="domain-readiness__bar" role="img" aria-label={`${readiness}% of the exam blueprint mastered`}>
        {domains.map((d) => (
          <div key={d.id} className="domain-readiness__segment" style={{ flexGrow: d.weight }}>
            <div className="domain-readiness__fill" style={{ width: `${mastery(d.id)}%` }} />
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
