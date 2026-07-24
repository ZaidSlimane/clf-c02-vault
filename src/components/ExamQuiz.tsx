import { useState, useEffect, useMemo } from 'react'
import questionsData from '../../CLF-C02 questions.json'

interface Question {
  url: string
  question_no: string
  question: string
  options: Record<string, string>
  discussion: string[]
  vote_counts: Record<string, number>
  most_voted: string
  community_answer: string
}

interface Progress {
  answers: Record<number, string>
  flags: Record<number, boolean>
  notes: Record<number, string>
}

const STORAGE_KEY = 'clf-c02-exam-progress'
const questions = questionsData as Question[]
const TOTAL = questions.length

function loadProgress(): Progress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { answers: {}, flags: {}, notes: {} }
  } catch {
    return { answers: {}, flags: {}, notes: {} }
  }
}

export default function ExamQuiz() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [showAnswer, setShowAnswer] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'flagged' | 'wrong'>('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  useEffect(() => {
    setNoteText(progress.notes[currentIndex] || '')
    setShowAnswer(!!progress.answers[currentIndex])
  }, [currentIndex])

  const q = questions[currentIndex]

  const stats = useMemo(() => {
    let correct = 0
    for (const [idx, ans] of Object.entries(progress.answers)) {
      if (questions[Number(idx)]?.most_voted === ans) correct++
    }
    return {
      answered: Object.keys(progress.answers).length,
      correct,
      wrong: Object.keys(progress.answers).length - correct,
      flagged: Object.keys(progress.flags).length,
    }
  }, [progress])

  const visibleIndices = useMemo(() => {
    const indices = Array.from({ length: TOTAL }, (_, i) => i)
    switch (filter) {
      case 'unanswered':
        return indices.filter(i => !(i in progress.answers))
      case 'flagged':
        return indices.filter(i => progress.flags[i])
      case 'wrong':
        return indices.filter(i => i in progress.answers && progress.answers[i] !== questions[i]?.most_voted)
      default:
        return indices
    }
  }, [filter, progress])

  if (!q) return null

  const optionLetters = Object.keys(q.options)
  const selected = progress.answers[currentIndex]
  const isFlagged = progress.flags[currentIndex] || false
  const correctAnswer = q.most_voted

  const handleSelect = (letter: string) => {
    setProgress(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentIndex]: letter },
    }))
    setShowAnswer(true)
  }

  const toggleFlag = () => {
    setProgress(prev => {
      const flags = { ...prev.flags }
      if (flags[currentIndex]) delete flags[currentIndex]
      else flags[currentIndex] = true
      return { ...prev, flags }
    })
  }

  const saveNote = () => {
    const trimmed = noteText.trim()
    setProgress(prev => {
      const notes = { ...prev.notes }
      if (trimmed) notes[currentIndex] = trimmed
      else delete notes[currentIndex]
      return { ...prev, notes }
    })
  }

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clf-c02-exam-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (data.answers && data.flags !== undefined && data.notes !== undefined) {
          setProgress(data)
        }
      } catch { }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const resetProgress = () => {
    if (window.confirm('Reset all quiz progress?')) {
      setProgress({ answers: {}, flags: {}, notes: {} })
      setCurrentIndex(0)
    }
  }

  const navigateToNextUnanswered = () => {
    for (let i = currentIndex + 1; i < TOTAL; i++) {
      if (!(i in progress.answers)) { setCurrentIndex(i); return }
    }
    for (let i = 0; i < currentIndex; i++) {
      if (!(i in progress.answers)) { setCurrentIndex(i); return }
    }
  }

  const getStatus = (idx: number) => {
    const ans = progress.answers[idx]
    if (!ans) return 'unanswered'
    return ans === questions[idx]?.most_voted ? 'correct' : 'wrong'
  }

  const getVoteSummary = (letter: string) => {
    const counts = q.vote_counts || {}
    return counts[letter] || 0
  }

  return (
    <div className="exam-quiz">
      {/* Header */}
      <div className="exam-header">
        <div className="exam-header-left">
          <h3>AWS CLF-C02 Exam Simulation</h3>
          <span className="exam-badge">{TOTAL} questions</span>
        </div>
        <div className="exam-header-right">
          <span className="exam-stat">
            Answered <strong>{stats.answered}/{TOTAL}</strong>
          </span>
          <span className="exam-stat exam-stat-correct">
            Correct <strong>{stats.correct}</strong>
          </span>
          <span className="exam-stat exam-stat-wrong">
            Wrong <strong>{stats.wrong}</strong>
          </span>
          <span className="exam-stat exam-stat-flagged">
            Flagged <strong>{stats.flagged}</strong>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="exam-progress-bar">
        <div
          className="exam-progress-fill"
          style={{ width: `${(stats.answered / TOTAL) * 100}%` }}
        />
      </div>

      {/* Toolbar */}
      <div className="exam-toolbar">
        <div className="exam-toolbar-left">
          <label className="exam-filter-label">
            Filter:
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
              <option value="all">All ({TOTAL})</option>
              <option value="unanswered">Unanswered ({TOTAL - stats.answered})</option>
              <option value="flagged">Flagged ({stats.flagged})</option>
              <option value="wrong">Wrong ({stats.wrong})</option>
            </select>
          </label>
        </div>
        <div className="exam-toolbar-right">
          <button className="exam-btn exam-btn-sm" onClick={navigateToNextUnanswered}>
            Next Unanswered
          </button>
          <button className="exam-btn exam-btn-sm" onClick={exportProgress}>
            Export Progress
          </button>
          <label className="exam-btn exam-btn-sm exam-btn-file">
            Import Progress
            <input type="file" accept=".json" onChange={importProgress} hidden />
          </label>
          <button className="exam-btn exam-btn-sm exam-btn-danger" onClick={resetProgress}>
            Reset
          </button>
        </div>
      </div>

      {/* Question card */}
      <div className="exam-question-card card">
        <div className="exam-question-topbar">
          <span className="exam-question-number">
            Question {currentIndex + 1} of {TOTAL}
          </span>
          <div className="exam-question-topbar-right">
            {isFlagged && <span className="exam-flag-badge">⚑ Flagged</span>}
            <button
              className={`exam-btn exam-btn-sm ${isFlagged ? 'exam-btn-active' : ''}`}
              onClick={toggleFlag}
            >
              {isFlagged ? '⚑ Unflag' : '⚐ Flag'}
            </button>
          </div>
        </div>

        <p className="exam-question-text">{q.question}</p>

        <div className="exam-options">
          {optionLetters.map(letter => {
            const isSelected = selected === letter
            const isCorrectAns = correctAnswer === letter
            const votes = getVoteSummary(letter)

            let optionClass = 'exam-option'
            if (showAnswer && isCorrectAns) optionClass += ' exam-option-correct'
            if (showAnswer && isSelected && !isCorrectAns) optionClass += ' exam-option-wrong'

            return (
              <button
                key={letter}
                className={optionClass}
                onClick={() => handleSelect(letter)}
                disabled={showAnswer}
              >
                <span className="exam-option-letter">{letter}.</span>
                <span className="exam-option-text">{q.options[letter]}</span>
                {showAnswer && isCorrectAns && (
                  <span className="exam-option-votes">✓ {votes} votes</span>
                )}
                {showAnswer && isSelected && !isCorrectAns && (
                  <span className="exam-option-votes">✗ {votes} votes</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Answer reveal */}
        {showAnswer && correctAnswer && (
          <div className="exam-answer-reveal">
            <div className="exam-answer-header">
              <strong>Community Answer: {correctAnswer}.</strong>
              <span className="exam-answer-text">{q.community_answer}</span>
            </div>
            <div className="exam-vote-breakdown">
              {optionLetters.map(l => {
                const v = getVoteSummary(l)
                if (v === 0) return null
                return (
                  <span key={l} className={`exam-vote-chip ${correctAnswer === l ? 'exam-vote-chip-correct' : ''}`}>
                    {l}: {v} vote{v !== 1 ? 's' : ''}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="exam-notes-section">
          <button
            className="exam-btn exam-btn-sm"
            onClick={() => {
              setIsNoteOpen(!isNoteOpen)
              if (isNoteOpen) saveNote()
            }}
          >
            📝 {isNoteOpen ? 'Save & Close' : 'Add Note'}
          </button>
          {isNoteOpen && (
            <div className="exam-notes-area">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write your note for this question..."
                rows={3}
              />
              <button className="exam-btn exam-btn-sm" onClick={saveNote}>
                Save Note
              </button>
            </div>
          )}
          {!isNoteOpen && progress.notes[currentIndex] && (
            <div className="exam-note-preview">
              📝 {progress.notes[currentIndex]}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="exam-nav-buttons">
          <button
            className="exam-btn"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          >
            ← Prev
          </button>
          <button
            className="exam-btn exam-btn-primary"
            onClick={() => setShowAnswer(prev => !prev)}
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
          <button
            className="exam-btn"
            disabled={currentIndex === TOTAL - 1}
            onClick={() => setCurrentIndex(prev => Math.min(TOTAL - 1, prev + 1))}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Question grid */}
      <div className="exam-grid-section">
        <div className="exam-grid-header">
          <span className="exam-grid-title">Question Navigator</span>
          <div className="exam-grid-legend">
            <span className="exam-legend-item">
              <span className="exam-legend-swatch exam-legend-correct" /> Correct
            </span>
            <span className="exam-legend-item">
              <span className="exam-legend-swatch exam-legend-wrong" /> Wrong
            </span>
            <span className="exam-legend-item">
              <span className="exam-legend-swatch exam-legend-flagged" /> Flagged
            </span>
            <span className="exam-legend-item">
              <span className="exam-legend-swatch exam-legend-unanswered" /> Unanswered
            </span>
          </div>
        </div>
        <div className="exam-grid">
          {visibleIndices.map(idx => {
            const status = getStatus(idx)
            const isCurrent = idx === currentIndex
            const flagged = progress.flags[idx]

            let cls = 'exam-grid-item'
            if (isCurrent) cls += ' exam-grid-current'
            if (status === 'correct') cls += ' exam-grid-correct'
            if (status === 'wrong') cls += ' exam-grid-wrong'
            if (flagged) cls += ' exam-grid-flagged'

            return (
              <button
                key={idx}
                className={cls}
                onClick={() => setCurrentIndex(idx)}
                title={`Q${idx + 1}${flagged ? ' (Flagged)' : ''}${status !== 'unanswered' ? ` (${status})` : ''}`}
              >
                {idx + 1}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
