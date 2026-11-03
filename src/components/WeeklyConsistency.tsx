import { studyLogs } from '../data/domains'

export default function WeeklyConsistency() {
  if (studyLogs.length === 0) {
    return <div className="empty-state">No data for this week.</div>
  }

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const weekLogs = studyLogs.filter((log) => new Date(log.date) >= oneWeekAgo)
  const totalMinutes = weekLogs.reduce((s, l) => s + l.minutes, 0)
  const hours = Math.round((totalMinutes / 60) * 10) / 10

  return (
    <div className="stats-row">
      <div className="card stat-card">
        <div className="stat-value">{hours}</div>
        <div className="stat-label">Hours</div>
      </div>
      <div className="card stat-card">
        <div className="stat-value">{weekLogs.length}</div>
        <div className="stat-label">Sessions</div>
      </div>
      <div className="card stat-card">
        <div className="stat-value">{totalMinutes}</div>
        <div className="stat-label">Minutes</div>
      </div>
      <div className="card stat-card">
        <div className="stat-value">{weekLogs.length > 0 ? Math.round(totalMinutes / weekLogs.length) : 0}</div>
        <div className="stat-label">Minutes per session</div>
      </div>
    </div>
  )
}
