import { Link } from 'react-router-dom'
import ExamQuiz from '../components/ExamQuiz'

export default function ExamPage() {
  return (
    <div>
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <ExamQuiz />
    </div>
  )
}
