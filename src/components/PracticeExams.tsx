import { practiceExams } from '../data/domains'

export default function PracticeExams() {
  if (practiceExams.length === 0) {
    return <div className="empty-state">No practice exams yet</div>
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
            <th>Weak areas</th>
            <th>Mistakes</th>
            <th>Retry plan</th>
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
