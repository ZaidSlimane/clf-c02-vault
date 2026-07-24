import { useState, useEffect, useMemo } from 'react'
import questionsData from '../../CLF-C02 questions.json'
import { sections, domains as domainsData } from '../data/sections'

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
  answers: Record<number, string[]>
  flags: Record<number, boolean>
  notes: Record<number, string>
  tags: Record<number, string>
}

const STORAGE_KEY = 'clf-c02-exam-progress'
const questions = questionsData as Question[]
const TOTAL = questions.length

function loadProgress(): Progress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { answers: {}, flags: {}, notes: {}, tags: {} }
    const parsed = JSON.parse(saved)
    const progress: Progress = { answers: {}, flags: {}, notes: {}, tags: {} }
    if (typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)) {
      for (const [k, v] of Object.entries(parsed.answers)) {
        progress.answers[Number(k)] = typeof v === 'string' ? [v] : (v as string[])
      }
    }
    if (parsed.flags) progress.flags = parsed.flags
    if (parsed.notes) progress.notes = parsed.notes
    if (parsed.tags) progress.tags = parsed.tags
    return progress
  } catch {
    return { answers: {}, flags: {}, notes: {}, tags: {} }
  }
}

function getRequiredChoices(question: string): number {
  const t = question.toLowerCase()
  if (/\b(choose|select)\s+(two|2)\b/.test(t) || /\bwhich\s+two\b/.test(t)) return 2
  return 1
}

function getCorrectAnswers(q: Question, count: number): string[] {
  const entries = Object.entries(q.vote_counts || {}).sort((a, b) => b[1] - a[1])
  return entries.slice(0, count).map(([letter]) => letter)
}

function isAnswerCorrect(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) return false
  return selected.every(s => correct.includes(s))
}

export default function ExamQuiz({ initialFilter }: { initialFilter?: string | null }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [showAnswer, setShowAnswer] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [noteTag, setNoteTag] = useState('')
  const [filter, setFilter] = useState<'all' | 'correct' | 'unanswered' | 'flagged' | 'wrong'>(
    (initialFilter as 'all' | 'correct' | 'unanswered' | 'flagged' | 'wrong') || 'all'
  )
  const [pending, setPending] = useState<string[]>([])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const q = questions[currentIndex]
  const choiceCount = q ? getRequiredChoices(q.question) : 1
  const isMulti = choiceCount > 1

  useEffect(() => {
    const saved = progress.answers[currentIndex]
    setPending(saved ? [...saved] : [])
    setShowAnswer(!!saved)
    setNoteText(progress.notes[currentIndex] || '')
    setNoteTag(progress.tags[currentIndex] || '')
  }, [currentIndex])

  const correctAnswers = q ? getCorrectAnswers(q, choiceCount) : []

  const stats = useMemo(() => {
    let correct = 0
    for (const [idx, selected] of Object.entries(progress.answers)) {
      const qq = questions[Number(idx)]
      if (!qq) continue
      const cnt = getRequiredChoices(qq.question)
      const correctSet = getCorrectAnswers(qq, cnt)
      if (isAnswerCorrect(selected, correctSet)) correct++
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
      case 'correct': {
        return indices.filter(i => {
          const sel = progress.answers[i]
          if (!sel) return false
          const qq = questions[i]
          if (!qq) return false
          const cnt = getRequiredChoices(qq.question)
          const correctSet = getCorrectAnswers(qq, cnt)
          return isAnswerCorrect(sel, correctSet)
        })
      }
      case 'wrong': {
        return indices.filter(i => {
          const sel = progress.answers[i]
          if (!sel) return false
          const qq = questions[i]
          if (!qq) return false
          const cnt = getRequiredChoices(qq.question)
          const correctSet = getCorrectAnswers(qq, cnt)
          return !isAnswerCorrect(sel, correctSet)
        })
      }
      default:
        return indices
    }
  }, [filter, progress])

  if (!q) return null

  const optionLetters = Object.keys(q.options)
  const isFlagged = progress.flags[currentIndex] || false
  const selected = progress.answers[currentIndex] || []

  const handleToggle = (letter: string) => {
    if (showAnswer) return
    if (isMulti) {
      setPending(prev => {
        if (prev.includes(letter)) return prev.filter(l => l !== letter)
        if (prev.length >= choiceCount) return prev
        return [...prev, letter]
      })
    } else {
      setProgress(prev => ({
        ...prev,
        answers: { ...prev.answers, [currentIndex]: [letter] },
      }))
      setShowAnswer(true)
    }
  }

  const submitMulti = () => {
    setProgress(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentIndex]: [...pending] },
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
      const tags = { ...prev.tags }
      if (trimmed) notes[currentIndex] = trimmed
      else delete notes[currentIndex]
      if (noteTag) tags[currentIndex] = noteTag
      else delete tags[currentIndex]
      return { ...prev, notes, tags }
    })
  }

  const exportProgress = () => {
    const data = { answers: progress.answers, flags: progress.flags, notes: progress.notes, tags: progress.tags }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
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
          const migrated: Record<number, string[]> = {}
          for (const [k, v] of Object.entries(data.answers)) {
            migrated[Number(k)] = typeof v === 'string' ? [v] : v as string[]
          }
          setProgress({ answers: migrated, flags: data.flags, notes: data.notes, tags: data.tags || {} })
        }
      } catch { }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const resetProgress = () => {
    if (window.confirm('Reset all quiz progress?')) {
      setProgress({ answers: {}, flags: {}, notes: {}, tags: {} })
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
    const sel = progress.answers[idx]
    if (!sel) return 'unanswered'
    const qq = questions[idx]
    if (!qq) return 'unanswered'
    const cnt = getRequiredChoices(qq.question)
    const correctSet = getCorrectAnswers(qq, cnt)
    return isAnswerCorrect(sel, correctSet) ? 'correct' : 'wrong'
  }

  const getVoteSummary = (letter: string) => {
    const counts = q.vote_counts || {}
    return counts[letter] || 0
  }

  const selectionComplete = isMulti ? pending.length === choiceCount : true

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

      <div className="exam-panels">
        <div className="exam-panel-main">
          {/* Question card */}
          <div className="exam-question-card card">
            <div className="exam-question-topbar">
              <span className="exam-question-number">
                Question {currentIndex + 1} of {TOTAL}
                {isMulti && <span className="exam-multi-badge"> (Choose {choiceCount})</span>}
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
                const isSelected = showAnswer
                  ? selected.includes(letter)
                  : pending.includes(letter)
                const isCorrectAns = correctAnswers.includes(letter)
                const votes = getVoteSummary(letter)

                let optionClass = 'exam-option'
                if (showAnswer && isCorrectAns) optionClass += ' exam-option-correct'
                if (showAnswer && isSelected && !isCorrectAns) optionClass += ' exam-option-wrong'
                if (!showAnswer && isSelected) optionClass += ' exam-option-selected'

                return (
                  <button
                    key={letter}
                    className={optionClass}
                    onClick={() => handleToggle(letter)}
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

            {/* Multi-select submit button */}
            {isMulti && !showAnswer && (
              <div className="exam-multi-actions">
                <span className="exam-multi-hint">
                  Select {choiceCount} option{choiceCount > 1 ? 's' : ''}
                  {pending.length > 0 && ` (${pending.length}/${choiceCount} selected)`}
                </span>
                <button
                  className="exam-btn exam-btn-primary"
                  disabled={!selectionComplete}
                  onClick={submitMulti}
                >
                  Submit Answer
                </button>
              </div>
            )}

            {/* Answer reveal */}
            {showAnswer && correctAnswers.length > 0 && (
              <div className="exam-answer-reveal">
                <div className="exam-answer-header">
                  <strong>
                    {isMulti ? 'Correct Answers' : 'Community Answer'}: {correctAnswers.join(', ')}.
                  </strong>
                  {!isMulti && <span className="exam-answer-text">{q.community_answer}</span>}
                </div>
                {isMulti && (
                  <div className="exam-answer-text" style={{ marginTop: 6 }}>
                    {correctAnswers.map(l => q.options[l]).join('; ')}
                  </div>
                )}
                <div className="exam-vote-breakdown">
                  {optionLetters.map(l => {
                    const v = getVoteSummary(l)
                    if (v === 0) return null
                    return (
                      <span key={l} className={`exam-vote-chip ${correctAnswers.includes(l) ? 'exam-vote-chip-correct' : ''}`}>
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
                  <div className="exam-note-tag-row">
                    <select
                      value={noteTag}
                      onChange={e => setNoteTag(e.target.value)}
                      className="exam-note-tag-select"
                    >
                      <option value="">— No section tag —</option>
                      {domainsData.map(d => (
                        <optgroup key={d.id} label={`${d.title}${d.weight ? ` (${d.weight}%)` : ''}`}>
                          {sections.filter(s => s.domainId === d.id).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.title}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
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
              {!isNoteOpen && (progress.notes[currentIndex] || progress.tags[currentIndex]) && (
                <div className="exam-note-preview">
                  {progress.tags[currentIndex] && (
                    <span className="exam-note-tag">
                      {sections.find(s => s.id === progress.tags[currentIndex])?.domainTitle}
                      {' › '}
                      {sections.find(s => s.id === progress.tags[currentIndex])?.title}
                    </span>
                  )}
                  {progress.notes[currentIndex] && <span>{progress.notes[currentIndex]}</span>}
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
        </div>

        <div className="exam-panel-side">
          {/* Side stats */}
          <div className="exam-side-stats">
            <div className="exam-side-stat">
              <span className="exam-side-stat-value">{stats.answered}/{TOTAL}</span>
              <span className="exam-side-stat-label">Answered</span>
            </div>
            <div className="exam-side-stat exam-side-stat-correct">
              <span className="exam-side-stat-value">{stats.correct}</span>
              <span className="exam-side-stat-label">Correct</span>
            </div>
            <div className="exam-side-stat exam-side-stat-wrong">
              <span className="exam-side-stat-value">{stats.wrong}</span>
              <span className="exam-side-stat-label">Wrong</span>
            </div>
            <div className="exam-side-stat exam-side-stat-flagged">
              <span className="exam-side-stat-value">{stats.flagged}</span>
              <span className="exam-side-stat-label">Flagged</span>
            </div>
          </div>

          {/* Question grid */}
          <div className="exam-grid-section">
            <div className="exam-grid-header">
              <span className="exam-grid-title">Navigator</span>
              <div className="exam-grid-legend">
                <span className="exam-legend-item">
                  <span className="exam-legend-swatch exam-legend-correct" /> 
                </span>
                <span className="exam-legend-item">
                  <span className="exam-legend-swatch exam-legend-wrong" /> 
                </span>
                <span className="exam-legend-item">
                  <span className="exam-legend-swatch exam-legend-flagged" /> 
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

          {/* Filter & actions */}
          <div className="exam-side-actions">
            <label className="exam-filter-label">
              Show:
              <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
                <option value="all">All</option>
                <option value="correct">Correct</option>
                <option value="unanswered">Unanswered</option>
                <option value="flagged">Flagged</option>
                <option value="wrong">Wrong</option>
              </select>
            </label>
            <button className="exam-btn exam-btn-sm" onClick={navigateToNextUnanswered}>
              Next Unans.
            </button>
            <button className="exam-btn exam-btn-sm" onClick={exportProgress}>
              Export
            </button>
            <label className="exam-btn exam-btn-sm exam-btn-file">
              Import
              <input type="file" accept=".json" onChange={importProgress} hidden />
            </label>
            <button className="exam-btn exam-btn-sm exam-btn-danger" onClick={resetProgress}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
