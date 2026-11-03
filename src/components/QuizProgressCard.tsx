import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import questionsData from '../../CLF-C02 questions.json'

interface Question {
  question: string
  options: Record<string, string>
  vote_counts: Record<string, number>
  most_voted: string
}

const STORAGE_KEY = 'clf-c02-exam-progress'
const questions = questionsData as Question[]
const TOTAL = questions.length

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

interface Progress {
  answers: Record<number, string[]>
  flags: Record<number, boolean>
  notes: Record<number, string>
  tags: Record<number, string>
}

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

export default function QuizProgressCard() {
  const [stats, setStats] = useState({ answered: 0, correct: 0, wrong: 0, flagged: 0 })

  useEffect(() => {
    const progress = loadProgress()
    let correct = 0
    for (const [idx, selected] of Object.entries(progress.answers)) {
      const qq = questions[Number(idx)]
      if (!qq) continue
      const cnt = getRequiredChoices(qq.question)
      const correctSet = getCorrectAnswers(qq, cnt)
      if (isAnswerCorrect(selected, correctSet)) correct++
    }
    setStats({
      answered: Object.keys(progress.answers).length,
      correct,
      wrong: Object.keys(progress.answers).length - correct,
      flagged: Object.keys(progress.flags).length,
    })
  }, [])

  const hasStarted = stats.answered > 0

  return (
    <div>
      <div className="section-header">
        <h2>Exam simulation</h2>
      </div>
      <div className="quiz-progress-row">
        <Link to="/exam" className="quiz-progress-card quiz-progress-continue">
          <span className="quiz-progress-card-value">
            {hasStarted ? 'Continue' : 'Start quiz'}
          </span>
          <span className="quiz-progress-card-label">{TOTAL} questions</span>
        </Link>
        <Link to="/exam" className="quiz-progress-card">
          <span className="quiz-progress-card-value">{stats.answered}<span className="quiz-progress-card-slash">/{TOTAL}</span></span>
          <span className="quiz-progress-card-label">Answered</span>
        </Link>
        <Link to="/exam?filter=correct" className="quiz-progress-card quiz-progress-correct">
          <span className="quiz-progress-card-value">{stats.correct}</span>
          <span className="quiz-progress-card-label">Correct</span>
        </Link>
        <Link to="/exam?filter=wrong" className="quiz-progress-card quiz-progress-wrong">
          <span className="quiz-progress-card-value">{stats.wrong}</span>
          <span className="quiz-progress-card-label">Wrong</span>
        </Link>
        <Link to="/exam?filter=flagged" className="quiz-progress-card quiz-progress-flagged">
          <span className="quiz-progress-card-value">{stats.flagged}</span>
          <span className="quiz-progress-card-label">Flagged</span>
        </Link>
      </div>
    </div>
  )
}
