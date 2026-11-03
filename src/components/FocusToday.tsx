import { Link } from 'react-router-dom'
import { domains } from '../data/domains'

export default function FocusToday() {
  const incomplete = domains
    .filter((d) => d.status !== 'complete')
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)

  if (incomplete.length === 0) return null

  return (
    <div className="focus-card">
      <div className="focus-content">
        <h3>Focus today</h3>
        {incomplete.map((d) => (
          <p key={d.id}>
            <Link to={`/domain/${d.id}`}>{d.title}</Link>{' '}
             &middot; {d.nextTopic} &middot; {d.mastery}% mastery
          </p>
        ))}
      </div>
    </div>
  )
}
