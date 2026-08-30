import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import ExamQuiz from '../components/ExamQuiz'
import CustomQuiz from '../components/CustomQuiz'

const MODE_KEY = 'clf-c02-exam-mode'

export default function ExamPage() {
  const [searchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') as 'all' | 'correct' | 'unanswered' | 'flagged' | 'wrong' | null
  const [mode, setMode] = useState<'official' | 'custom'>(() => {
    try { return localStorage.getItem(MODE_KEY) === 'custom' ? 'custom' : 'official' } catch { return 'official' }
  })

  const switchMode = (next: 'official' | 'custom') => {
    setMode(next)
    try { localStorage.setItem(MODE_KEY, next) } catch { }
  }

  return (
    <div>
      <Link to="/" className="back-link">← Back to Dashboard</Link>
      <div className="exam-mode-tabs">
        <button
          className={`exam-mode-tab ${mode === 'official' ? 'exam-mode-tab-active' : ''}`}
          onClick={() => switchMode('official')}
        >
          Official Practice Exam
        </button>
        <button
          className={`exam-mode-tab ${mode === 'custom' ? 'exam-mode-tab-active' : ''}`}
          onClick={() => switchMode('custom')}
        >
          Custom Quiz (Paste JSON)
        </button>
      </div>
      {mode === 'official' ? <ExamQuiz initialFilter={filterParam} /> : <CustomQuiz />}
    </div>
  )
}
