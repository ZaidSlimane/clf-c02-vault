const bars = [
  { label: 'Cloud Concepts', weight: 24, days: 12, color: '#FF9900', section: 'Domain 1 (24%)' },
  { label: 'Security & Compliance', weight: 30, days: 14, color: '#10B981', section: 'Domain 2 (30%)' },
  { label: 'Compute', weight: 0, days: 5, color: '#3B82F6', section: 'Domain 3 (34%)' },
  { label: 'Storage', weight: 0, days: 4, color: '#60A5FA', section: '' },
  { label: 'Networking', weight: 0, days: 4, color: '#93C5FD', section: '' },
  { label: 'Databases & Analytics', weight: 0, days: 4, color: '#BFDBFE', section: '' },
  { label: 'Billing & Pricing', weight: 12, days: 4, color: '#8B5CF6', section: 'Domain 4 (12%)' },
  { label: 'Final Review', weight: 0, days: 3, color: '#F59E0B', section: 'Review' },
]

export default function StudyTimeline() {
  const totalDays = bars.reduce((s, b) => s + b.days, 0)

  return (
    <div className="timeline">
      {bars.map((bar, i) => (
        <div key={i} className="timeline-section">
          {bar.section && (
            <div className="timeline-section-label">{bar.section}</div>
          )}
          <div
            className="timeline-bar"
            style={{
              width: `${(bar.days / totalDays) * 100}%`,
              background: bar.color,
              opacity: bar.label === 'Final Review' ? 0.7 : 1,
            }}
          >
            {bar.label}
          </div>
        </div>
      ))}
      <div className="timeline-labels">
        <span>Jul 22</span>
        <span>Aug 3</span>
        <span>Aug 17</span>
        <span>Sep 3</span>
        <span>Sep 9</span>
      </div>
    </div>
  )
}
