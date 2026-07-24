import { studyLogs } from '../data/domains'

export default function RecentActivity() {
  if (studyLogs.length === 0) {
    return <div className="empty-state">No study sessions logged yet. Start studying and log your first session!</div>
  }

  const recent = studyLogs.slice(0, 5)

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Domain</th>
            <th>Minutes</th>
            <th>Topics Covered</th>
            <th>Next Action</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((log, i) => (
            <tr key={i}>
              <td>{log.date}</td>
              <td>Domain {log.domain}</td>
              <td>{log.minutes}</td>
              <td>{log.topics.join(', ')}</td>
              <td>{log.nextAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
