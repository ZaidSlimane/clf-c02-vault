import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import ExamQuiz from '../components/ExamQuiz'

export default function ExamPage() {
  const [searchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') as 'all' | 'correct' | 'unanswered' | 'flagged' | 'wrong' | null

  return (
    <div>
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <ExamQuiz initialFilter={filterParam} />
    </div>
  )
}
