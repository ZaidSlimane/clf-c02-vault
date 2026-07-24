import { practiceExams } from '../data/domains'

export default function PracticeExams() {
  if (practiceExams.length === 0) {
    return <div className="empty-state">No practice exams taken yet. Take a mock exam to track your progress here.</div>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
            <th>Weak Areas</th>
            <th>Mistakes</th>
            <th>Retry Plan</th>
          </tr>
        </thead>
        <tbody>
          {practiceExams.map((exam, i) => (
            <tr key={i}>
              <td>{exam.date}</td>
              <td>{exam.score}%</td>
              <td>{exam.weakDomains.join(', ') || '—'}</td>
              <td>{exam.mistakes}</td>
              <td>{exam.retryPlan || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
