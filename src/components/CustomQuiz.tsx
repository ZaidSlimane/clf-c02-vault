import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react'
import exampleQuiz from '../../aws_certified_cloud_practitioner_full_10_chapters.json'
import { sections, domains as siteDomains } from '../data/sections'
import { readUserItem, writeUserItem } from '../services/userStorage'

/* ── Types ─────────────────────────────────────────────────────────── */

interface DomainRef {
  id: string
  title: string
  weight: number
  color: string
}

interface QuizQuestion {
  idx: number
  id: string
  chapterNumber?: number
  chapterTitle: string
  question: string
  choices: Record<string, string>
  coursePart: string
  bookAnswer: string[]
  hasBookAnswer: boolean
  domain: DomainRef | null
}

interface QuizProgress {
  answers: Record<number, string[]>
  flags: Record<number, boolean>
  currentIndex: number
  filter: string
  sourceHash: string
}

interface DomainStat {
  domain: DomainRef
  total: number
  answered: number
  correct: number
  wrong: number
  unanswered: number
  ungraded: number
  graded: number
}

/* ── Constants ─────────────────────────────────────────────────────── */

const SOURCE_KEY = 'clf-c02-custom-quiz-source'
const PROGRESS_KEY = 'clf-c02-custom-quiz-progress'

const domainRefs: Record<string, DomainRef> = {}
for (const d of siteDomains) {
  if (d.id !== 'prep') domainRefs[d.id] = { id: d.id, title: d.title, weight: d.weight, color: d.color }
}
const OTHER_DOMAIN: DomainRef = { id: 'other', title: 'Other / Unclassified', weight: 0, color: '#6B7280' }

const FILTERS = ['all', 'correct', 'unanswered', 'flagged', 'wrong', 'ungraded'] as const
type Filter = typeof FILTERS[number]

/* ── Helpers ───────────────────────────────────────────────────────── */

function toAnswerArray(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map(a => String(a).trim()).filter(Boolean)
  return String(raw).split(',').map(a => a.trim()).filter(Boolean)
}

function hashCode(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return String(h)
}

function hasAny(text: string, words: string[]): boolean {
  return words.some(w => text.includes(w))
}

const KEY_CONCEPTS = [
  'well-architected', 'cloud concept', 'cloud computing', 'shared responsibility',
  'adoption framework', 'hybrid cloud', 'elasticity', 'scalability',
  'operational excellence', 'performance efficiency', 'sustainab',
  'design principle', 'migration strateg', 'cloud deployment',
]
const KEY_SECURITY = [
  'securit', 'iam', ' identity', 'encrypt', 'complian', 'audit', 'mfa',
  'cryptograph', 'malware', 'firewall', 'artifact', 'certificate', 'pci',
  'ddos', 'guardduty', ' waf', 'access key', 'password', 'root user',
  'authenticat', 'credential', 'shield',
]
const KEY_BILLING = [
  'billing', 'budget', 'cost', 'pricing', 'support plan', 'trusted advisor',
  'free tier', 'spend', 'account management', 'organizations', 'payment',
  'savings plan', 'reserved instance', 'monthly fee', 'calculator',
]
const KEY_TECH = [
  'ec2', 's3', 'rds', 'dynamodb', 'aurora', 'elasticache', 'lambda',
  'storage', 'compute', 'database', 'networking', 'vpc', 'load balanc',
  'cloudfront', 'route 53', 'monitoring', 'automation', 'devops', 'elastic',
  'global infrastructure', 'availability zone', 'serverless', 'deploy',
  'autoscal', 'instance', 'snapshot', 'container', 'cloudwatch', 'cloudtrail',
  'api gateway', 'sqs', 'ebs', 'efs', 'redshift', 'athena', 'kinesis',
  'subnet', 'gateway', 'machine learning', 'static websit',
]

function classifyDomain(
  coursePart: string,
  chapterTitle: string,
  question: string,
  choices: Record<string, string>
): DomainRef | null {
  const text = [coursePart, chapterTitle, question, ...Object.values(choices)].join(' ').toLowerCase()
  const numMatch = String(coursePart || '').match(/^(\d+)/)
  if (numMatch) {
    const num = numMatch[1]
    const cpLower = String(coursePart).toLowerCase()
    if (num === '16') {
      return domainRefs[/securit|iam|identity|encrypt|complian|audit/.test(cpLower) ? '2' : '3'] ?? null
    }
    if (num === '14') return domainRefs['3'] ?? null
    const sec = sections.find(s => s.id === num)
    if (sec && sec.domainId && sec.domainId !== 'prep' && domainRefs[sec.domainId]) {
      return domainRefs[sec.domainId]
    }
  }
  if (hasAny(text, KEY_CONCEPTS)) return domainRefs['1'] ?? null
  if (hasAny(text, KEY_SECURITY)) return domainRefs['2'] ?? null
  if (hasAny(text, KEY_BILLING)) return domainRefs['4'] ?? null
  if (hasAny(text, KEY_TECH)) return domainRefs['3'] ?? null
  return null
}

function parseQuiz(raw: unknown): { questions: QuizQuestion[]; title: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const root = raw as Record<string, any>
  const title = String(root.title || root.metadata?.title || 'Custom Quiz')

  interface Wrapped { q: any; chapterNumber?: number; chapterTitle: string }
  const wrapped: Wrapped[] = []

  const chapters = Array.isArray(root.chapters) ? root.chapters : Array.isArray(root.quizzes) ? root.quizzes : null
  if (chapters) {
    chapters.forEach((ch: any, ci: number) => {
      const cpTitle = String(ch?.title || `Chapter ${ch?.chapter_number ?? ci + 1}`)
      const qs = Array.isArray(ch?.questions) ? ch.questions : []
      if (!qs.length) return
      qs.forEach((q: any) => wrapped.push({ q, chapterNumber: ch?.chapter_number, chapterTitle: cpTitle }))
    })
  } else if (Array.isArray(root.questions)) {
    root.questions.forEach((q: any) => wrapped.push({ q, chapterTitle: 'Questions' }))
  }

  if (!wrapped.length) return null

  const questions: QuizQuestion[] = wrapped.map(({ q, chapterNumber, chapterTitle }, idx) => {
    const choicesRaw = q && (q.choices || q.options)
    const choices: Record<string, string> = {}
    if (choicesRaw && typeof choicesRaw === 'object') {
      for (const [k, v] of Object.entries(choicesRaw)) choices[k] = String(v ?? '')
    }
    const questionText = String(q?.question || q?.questionText || '')
    const coursePart = String(q?.course_part || q?.coursePart || q?.section || q?.topic || '')
    const bookAnswer = toAnswerArray(
      q ? (q.book_answer ?? q.answer ?? q.correct_answer ?? q.correctAnswer) ?? null : null
    )
    const domain = classifyDomain(coursePart, chapterTitle, questionText, choices)
    return {
      idx,
      id: String(q?.id || `Q${idx + 1}`),
      chapterNumber,
      chapterTitle,
      question: questionText,
      choices,
      coursePart,
      bookAnswer,
      hasBookAnswer: bookAnswer.length > 0,
      domain,
    }
  })

  return { questions, title }
}

function blankProgress(sourceHash: string): QuizProgress {
  return { answers: {}, flags: {}, currentIndex: 0, filter: 'all', sourceHash }
}

function isAnswerCorrect(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) return false
  return selected.every(s => correct.includes(s))
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function CustomQuiz() {
  const [rawJson, setRawJson] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [parsed, setParsed] = useState<{ questions: QuizQuestion[]; sourceHash: string } | null>(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<QuizProgress | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const hashRef = useRef('')
  const readyRef = useRef(false)

  const questions = parsed?.questions ?? null
  const TOTAL = questions?.length ?? 0
  const sourceHash = parsed?.sourceHash ?? hashRef.current

  /* Persist progress */
  useEffect(() => {
    if (!readyRef.current || !progress) return
    writeUserItem(PROGRESS_KEY, JSON.stringify(progress))
  }, [progress])

  /* Restore from localStorage on mount */
  useEffect(() => {
    try {
      const savedSource = readUserItem(SOURCE_KEY)
      if (!savedSource) { readyRef.current = true; return }
      const savedProgress = readUserItem(PROGRESS_KEY)
      const sourceHash = hashCode(savedSource)
      hashRef.current = sourceHash
      const quiz = parseQuiz(JSON.parse(savedSource))
      if (!quiz) { readyRef.current = true; return }
      setRawJson(savedSource)
      setSourceTitle(quiz.title)
      let restored: QuizProgress = blankProgress(sourceHash)
      if (savedProgress) {
        const p = JSON.parse(savedProgress)
        if (p.sourceHash === sourceHash) {
          restored = {
            answers: p.answers || {},
            flags: p.flags || {},
            currentIndex: typeof p.currentIndex === 'number' ? p.currentIndex : 0,
            filter: FILTERS.includes(p.filter) ? p.filter : 'all',
            sourceHash,
          }
        }
      }
      setParsed({ questions: quiz.questions, sourceHash })
      setProgress(restored)
    } catch {
      /* ignore corrupted storage */
    } finally {
      readyRef.current = true
    }
  }, [])

  /* Load a quiz from text */
  const loadQuiz = (text: string) => {
    setError('')
    try {
      const quiz = parseQuiz(JSON.parse(text))
      if (!quiz) {
        setError('No questions found. Expected a "chapters" (with "questions") or a "questions" array.')
        return
      }
      const h = hashCode(text)
      hashRef.current = h
      setRawJson(text)
      setSourceTitle(quiz.title)
      setParsed({ questions: quiz.questions, sourceHash: h })
      setProgress(blankProgress(h))
      setShowAnalytics(false)
      writeUserItem(SOURCE_KEY, text)
    } catch {
      setError('Invalid JSON. Paste a valid JSON quiz file and try again.')
    }
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => loadQuiz(String(reader.result || ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  /* Prefill + load the bundled example */
  const loadExample = () => loadQuiz(JSON.stringify(exampleQuiz, null, 2))

  const q = questions && typeof progress?.currentIndex === 'number' ? questions[progress.currentIndex] : null
  const choiceCount = q ? (q.bookAnswer.length > 1 ? q.bookAnswer.length : 1) : 1
  const isMulti = q ? q.bookAnswer.length > 1 : false

  useEffect(() => {
    if (!q || !progress) return
    const saved = progress.answers[q.idx]
    setPending(saved ? [...saved] : [])
    setShowAnswer(!!saved)
  }, [q?.idx])  // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    let correct = 0, answered = 0, ungraded = 0, flagged = 0
    if (questions && progress) {
      for (const qq of questions) {
        const sel = progress.answers[qq.idx]
        if (sel && sel.length) {
          answered++
          if (!qq.hasBookAnswer) ungraded++
          else if (isAnswerCorrect(sel, qq.bookAnswer)) correct++
        }
        if (progress.flags[qq.idx]) flagged++
      }
    }
    return {
      answered,
      total: TOTAL,
      correct,
      wrong: answered - correct - ungraded,
      ungraded,
      flagged,
    }
  }, [questions, progress, TOTAL])

  const visibleIndices = useMemo(() => {
    if (!questions || !progress) return []
    return questions.map(qq => qq.idx).filter(idx => {
      const sel = progress.answers[idx]
      const status = !sel || !sel.length ? 'unanswered'
        : !questions[idx].hasBookAnswer ? 'ungraded'
        : isAnswerCorrect(sel, questions[idx].bookAnswer) ? 'correct' : 'wrong'
      switch (progress.filter) {
        case 'correct': return status === 'correct'
        case 'wrong': return status === 'wrong'
        case 'unanswered': return status === 'unanswered'
        case 'ungraded': return status === 'ungraded'
        case 'flagged': return !!progress.flags[idx]
        default: return true
      }
    })
  }, [questions, progress])

  const getStatus = (idx: number): 'unanswered' | 'ungraded' | 'correct' | 'wrong' => {
    if (!questions) return 'unanswered'
    const sel = progress?.answers[idx]
    if (!sel || !sel.length) return 'unanswered'
    const qq = questions[idx]
    if (!qq.hasBookAnswer) return 'ungraded'
    return isAnswerCorrect(sel, qq.bookAnswer) ? 'correct' : 'wrong'
  }

  const selectCurrent = (idx: number) => {
    setProgress(prev => prev ? { ...prev, currentIndex: idx } : prev)
  }

  const handleToggle = (letter: string) => {
    if (!q || !progress || showAnswer) return
    if (isMulti) {
      setPending(prev => {
        if (prev.includes(letter)) return prev.filter(l => l !== letter)
        if (prev.length >= choiceCount) return prev
        return [...prev, letter]
      })
    } else {
      setProgress(prev => prev ? {
        ...prev,
        answers: { ...prev.answers, [q.idx]: [letter] },
      } : prev)
      setShowAnswer(true)
    }
  }

  const submitMulti = () => {
    if (!q || !progress) return
    setProgress(prev => prev ? {
      ...prev,
      answers: { ...prev.answers, [q.idx]: [...pending] },
    } : prev)
    setShowAnswer(true)
  }

  const toggleFlag = () => {
    if (!q || !progress) return
    setProgress(prev => {
      if (!prev) return prev
      const flags = { ...prev.flags }
      if (flags[q.idx]) delete flags[q.idx]
      else flags[q.idx] = true
      return { ...prev, flags }
    })
  }

  const navigateNextUnanswered = () => {
    if (!questions || !progress) return
    const start = progress.currentIndex
    for (let step = 1; step <= TOTAL; step++) {
      const idx = (start + step) % TOTAL
      if (!progress.answers[idx] || !progress.answers[idx].length) { selectCurrent(idx); return }
    }
  }

  const resetAnswers = () => {
    if (!progress) return
    if (window.confirm('Reset all answers for this custom quiz?')) {
      setProgress(prev => prev ? { ...prev, answers: {}, flags: {}, currentIndex: 0 } : prev)
      setShowAnalytics(false)
    }
  }

  const replaceQuiz = () => {
    setParsed(null)
    setProgress(null)
    setShowAnalytics(false)
    setError('')
  }

  /* ── Analytics ── */

  const analytics = useMemo(() => {
    if (!questions || !progress) return null
    const byDomain = new Map<string, DomainStat>()
    let overall = { total: 0, answered: 0, correct: 0, wrong: 0, unanswered: 0, ungraded: 0, graded: 0 }
    for (const qq of questions) {
      const key = qq.domain?.id ?? 'other'
      const ref = qq.domain ?? OTHER_DOMAIN
      let st = byDomain.get(key)
      if (!st) { st = { domain: ref, total: 0, answered: 0, correct: 0, wrong: 0, unanswered: 0, ungraded: 0, graded: 0 }; byDomain.set(key, st) }
      st.total++
      overall.total++
      const sel = progress.answers[qq.idx]
      if (!sel || !sel.length) { st.unanswered++; overall.unanswered++; continue }
      st.answered++
      overall.answered++
      if (!qq.hasBookAnswer) { st.ungraded++; overall.ungraded++; continue }
      st.graded++
      overall.graded++
      if (isAnswerCorrect(sel, qq.bookAnswer)) { st.correct++; overall.correct++ } else { st.wrong++; overall.wrong++ }
    }
    const domains = Array.from(byDomain.values()).sort((a, b) => b.total - a.total)
    const score = overall.graded > 0 ? Math.round((overall.correct / overall.graded) * 100) : 0
    let weakest: DomainStat | null = null
    for (const d of domains) {
      if (d.graded < 3) continue
      const acc = d.graded > 0 ? d.correct / d.graded : 0
      if (!weakest || acc < weakest.correct / weakest.graded) weakest = d
    }
    return { overall, domains, score, weakest }
  }, [questions, progress])

  const chapterStats = useMemo(() => {
    if (!questions || !progress) return []
    const byChapter = new Map<string, { title: string; total: number; answered: number; correct: number; wrong: number; ungraded: number }>()
    for (const qq of questions) {
      let c = byChapter.get(qq.chapterTitle)
      if (!c) { c = { title: qq.chapterTitle, total: 0, answered: 0, correct: 0, wrong: 0, ungraded: 0 }; byChapter.set(qq.chapterTitle, c) }
      c.total++
      const sel = progress.answers[qq.idx]
      if (!sel || !sel.length) continue
      c.answered++
      if (!qq.hasBookAnswer) c.ungraded++
      else if (isAnswerCorrect(sel, qq.bookAnswer)) c.correct++
      else c.wrong++
    }
    return Array.from(byChapter.values())
  }, [questions, progress])

  /* ── Render ── */

  if (!questions || !progress || !q) {
    return (
      <div className="custom-quiz">
        <div className="custom-loader card">
          <div className="custom-loader-header">
            <div>
              <span className="vault-eyebrow">CUSTOM QUIZ · BYO QUESTION SET</span>
              <h3>Paste a JSON quiz file</h3>
            </div>
          </div>
          <p className="custom-loader-desc">
            Paste any question set saved as JSON, then answer and finish with analytics
            broken down by AWS exam domain. Supports <code>chapters[].questions[]</code> or a flat{' '}
            <code>questions[]</code> array — exactly like{' '}
            <code>aws_certified_cloud_practitioner_full_10_chapters.json</code>.
          </p>
          <pre className="custom-loader-sample">{`{
  "metadata": { "title": "My Quiz" },
  "chapters": [{
    "chapter_number": 1,
    "title": "Compute",
    "questions": [{
      "question": "Which service provides virtual servers?",
      "choices": { "A": "EC2", "B": "S3", "C": "Lambda" },
      "book_answer": "A",
      "course_part": "05 - EC2 - Elastic Compute Cloud"
    }]
  }]
}`}</pre>
          <textarea
            className="custom-loader-input"
            value={rawJson}
            onChange={e => setRawJson(e.target.value)}
            placeholder="Paste your quiz JSON here…"
            rows={10}
          />
          {error && <div className="custom-loader-error">{error}</div>}
          <div className="custom-loader-actions">
            <button className="exam-btn exam-btn-primary" onClick={() => loadQuiz(rawJson)}>
              Load Quiz
            </button>
            <button className="exam-btn" onClick={loadExample}>
              Load Example Question Set
            </button>
            <label className="exam-btn exam-btn-file">
              Upload .json
              <input type="file" accept=".json,application/json" onChange={handleFile} hidden />
            </label>
          </div>
        </div>
      </div>
    )
  }

  const isFlagged = progress.flags[q.idx] || false
  const selected = progress.answers[q.idx] || []
  const correctAnswers = q.bookAnswer
  const selectionComplete = !isMulti || pending.length === choiceCount
  const quizComplete = stats.answered === TOTAL

  return (
    <div className="custom-quiz">
      {/* Header */}
      <div className="exam-header custom-header">
        <div className="exam-header-left">
          <div>
            <span className="vault-eyebrow">CUSTOM QUIZ · {stats.answered}/{TOTAL} ANSWERED</span>
            <h3>{sourceTitle}</h3>
          </div>
          <span className="exam-badge">{TOTAL} QUESTIONS · SOURCE JSON</span>
        </div>
        <div className="exam-header-right">
          <span className="exam-stat">Answered <strong>{stats.answered}/{TOTAL}</strong></span>
          <span className="exam-stat exam-stat-correct">Correct <strong>{stats.correct}</strong></span>
          <span className="exam-stat exam-stat-wrong">Wrong <strong>{stats.wrong}</strong></span>
          <span className="exam-stat exam-stat-flagged">Ungraded <strong>{stats.ungraded}</strong></span>
          <span className="exam-stat exam-stat-flagged">Flagged <strong>{stats.flagged}</strong></span>
          <button className="exam-btn exam-btn-sm exam-btn-primary" onClick={() => setShowAnalytics(v => !v)}>
            {showAnalytics ? '← Back to Questions' : '📊 Domain Analytics'}
          </button>
        </div>
      </div>

      <div className="exam-progress-bar">
        <div className="exam-progress-fill" style={{ width: `${(stats.answered / TOTAL) * 100}%` }} />
      </div>

      {quizComplete && !showAnalytics && (
        <div className="custom-complete-banner card">
          <span className="custom-complete-emoji">🎉</span>
          <div>
            <strong>Quiz complete!</strong> You answered all {TOTAL} questions.
            {analytics && ` Score: ${analytics.score}%${analytics.weakest ? ` · Weakest domain: ${analytics.weakest.domain.title}` : ''}`}
          </div>
          <button className="exam-btn exam-btn-primary" onClick={() => setShowAnalytics(true)}>
            View Results &amp; Analytics
          </button>
        </div>
      )}

      {showAnalytics && analytics ? (
        <div className="custom-analytics">
          <div className="card custom-analytics-overview">
            <div className="custom-analytics-score">
              <span className="custom-analytics-score-value">{analytics.score}%</span>
              <span className="custom-analytics-score-label">Score (graded)</span>
            </div>
            <div className="custom-analytics-summary">
              <span><strong>{analytics.overall.correct}</strong> correct</span>
              <span><strong>{analytics.overall.wrong}</strong> wrong</span>
              <span><strong>{analytics.overall.unanswered}</strong> unanswered</span>
              <span><strong>{analytics.overall.ungraded}</strong> ungraded (no answer key)</span>
            </div>
            {analytics.weakest && (
              <div className="custom-analytics-tip">
                💡 Focus next on <strong style={{ color: analytics.weakest.domain.color }}>{analytics.weakest.domain.title}</strong> — your weakest domain by accuracy.
              </div>
            )}
          </div>

          <div className="custom-analytics-section-title">
            <span className="vault-eyebrow">AWS EXAM DOMAINS</span>
            <h4>Domain breakdown</h4>
          </div>
          <div className="custom-domain-list">
            {analytics.domains.map(st => {
              const considered = st.correct + st.wrong
              const accuracy = considered > 0 ? Math.round((st.correct / considered) * 100) : 0
              const pct = st.total > 0 ? (st.correct + st.wrong) / st.total : 0
              return (
                <div key={st.domain.id} className="card custom-domain-card">
                  <div className="custom-domain-head">
                    <span className="custom-domain-dot" style={{ background: st.domain.color }} />
                    <span className="custom-domain-title">{st.domain.title}</span>
                    <span className="custom-domain-count">{st.total} questions</span>
                    {st.graded > 0 && (
                      <span className="custom-domain-accuracy">{accuracy}% accuracy</span>
                    )}
                  </div>
                  <div className="custom-domain-bar">
                    {st.correct > 0 && <div className="custom-domain-bar-correct" style={{ width: `${(st.correct / st.total) * 100}%` }} />}
                    {st.wrong > 0 && <div className="custom-domain-bar-wrong" style={{ width: `${(st.wrong / st.total) * 100}%` }} />}
                    {st.ungraded > 0 && <div className="custom-domain-bar-ungraded" style={{ width: `${(st.ungraded / st.total) * 100}%` }} />}
                    {st.unanswered > 0 && <div className="custom-domain-bar-unanswered" style={{ width: `${(st.unanswered / st.total) * 100}%` }} />}
                  </div>
                  <div className="custom-domain-legend">
                    <span><i className="legend-dot legend-correct" /> {st.correct} correct</span>
                    <span><i className="legend-dot legend-wrong" /> {st.wrong} wrong</span>
                    <span><i className="legend-dot legend-ungraded" /> {st.ungraded} ungraded</span>
                    <span><i className="legend-dot legend-unanswered" /> {st.unanswered} unanswered</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="custom-analytics-section-title">
            <span className="vault-eyebrow">BY CHAPTER</span>
            <h4>Chapter progress</h4>
          </div>
          <div className="card custom-chapter-list">
            {chapterStats.map(c => (
              <div key={c.title} className="custom-chapter-row">
                <span className="custom-chapter-title">{c.title}</span>
                <span className="custom-chapter-meta">
                  {c.answered}/{c.total} · {c.correct} ✓ · {c.wrong} ✗ {c.ungraded > 0 && `· ${c.ungraded} ungraded`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="exam-panels">
          <div className="exam-panel-main">
            <div className="exam-question-card card">
              <div className="exam-question-topbar">
                <span className="exam-question-number">
                  <span className="vault-eyebrow">
                    QUESTION {String(q.idx + 1).padStart(3, '0')} · {q.chapterTitle.toUpperCase()}
                  </span>
                  Question {q.idx + 1} of {TOTAL}
                  {isMulti && <span className="exam-multi-badge"> (Choose {choiceCount})</span>}
                </span>
                <div className="exam-question-topbar-right">
                  {isFlagged && <span className="exam-flag-badge">⚑ Flagged</span>}
                  <button className={`exam-btn exam-btn-sm ${isFlagged ? 'exam-btn-active' : ''}`} onClick={toggleFlag}>
                    {isFlagged ? '⚑ Unflag' : '⚐ Flag'}
                  </button>
                </div>
              </div>

              {q.coursePart && (
                <div className="custom-coursepart">
                  <span className="custom-coursepart-tag">📚 {q.coursePart}</span>
                  {q.domain && (
                    <span className="custom-coursepart-tag" style={{ color: q.domain.color }}>
                      ◉ Domain {q.domain.id} · {q.domain.title}
                    </span>
                  )}
                </div>
              )}

              <p className="exam-question-text">{q.question}</p>

              <div className="exam-options">
                {Object.entries(q.choices).map(([letter, text]) => {
                  const isSelected = showAnswer ? selected.includes(letter) : pending.includes(letter)
                  const isCorrectAns = correctAnswers.includes(letter)
                  let optionClass = 'exam-option'
                  if (q.hasBookAnswer && showAnswer && isCorrectAns) optionClass += ' exam-option-correct'
                  if (q.hasBookAnswer && showAnswer && isSelected && !isCorrectAns) optionClass += ' exam-option-wrong'
                  if (!q.hasBookAnswer && showAnswer && isSelected) optionClass += ' exam-option-selected'
                  if (!showAnswer && isSelected) optionClass += ' exam-option-selected'
                  return (
                    <button key={letter} className={optionClass} onClick={() => handleToggle(letter)} disabled={showAnswer}>
                      <span className="exam-option-letter">{letter}.</span>
                      <span className="exam-option-text">{text}</span>
                      {q.hasBookAnswer && showAnswer && isCorrectAns && <span className="exam-option-votes">✓ Correct</span>}
                      {q.hasBookAnswer && showAnswer && isSelected && !isCorrectAns && <span className="exam-option-votes">✗ Incorrect</span>}
                    </button>
                  )
                })}
              </div>

              {isMulti && !showAnswer && (
                <div className="exam-multi-actions">
                  <span className="exam-multi-hint">
                    Select {choiceCount} option{choiceCount > 1 ? 's' : ''}
                    {pending.length > 0 && ` (${pending.length}/${choiceCount} selected)`}
                  </span>
                  <button className="exam-btn exam-btn-primary" disabled={!selectionComplete} onClick={submitMulti}>
                    Submit Answer
                  </button>
                </div>
              )}

              {showAnswer && (
                <div className="exam-answer-reveal">
                  {q.hasBookAnswer ? (
                    <div className="exam-answer-header">
                      <strong>Correct Answer{correctAnswers.length > 1 ? 's' : ''}: {correctAnswers.join(', ')}.</strong>
                      <div className="exam-answer-text" style={{ marginTop: 6 }}>
                        {correctAnswers.map(l => q.choices[l]).join('; ')}
                      </div>
                    </div>
                  ) : (
                    <div className="exam-answer-header">
                      <strong>Answer saved.</strong>
                      <div className="exam-answer-text" style={{ marginTop: 6 }}>
                        This question has no reference answer in the file, so it can’t be auto-graded.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="exam-nav-buttons">
                <button
                  className="exam-btn"
                  disabled={progress.currentIndex === 0}
                  onClick={() => selectCurrent(Math.max(0, progress.currentIndex - 1))}
                >
                  ← Prev
                </button>
                <button className="exam-btn exam-btn-primary" onClick={() => setShowAnswer(v => !v)} disabled={!selected.length}>
                  {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>
                <button
                  className="exam-btn"
                  disabled={progress.currentIndex === TOTAL - 1}
                  onClick={() => selectCurrent(Math.min(TOTAL - 1, progress.currentIndex + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          <div className="exam-panel-side">
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
                <span className="exam-side-stat-value">{stats.ungraded}</span>
                <span className="exam-side-stat-label">Ungraded</span>
              </div>
            </div>

            <div className="exam-grid-section">
              <div className="exam-grid-header">
                <div><span className="vault-eyebrow">QUESTION NAVIGATOR</span><span className="exam-grid-title">{questions.length} questions</span></div>
              </div>
              <div className="exam-grid">
                {visibleIndices.map(idx => {
                  const status = getStatus(idx)
                  const isCurrent = idx === progress.currentIndex
                  const flagged = progress.flags[idx]
                  let cls = 'exam-grid-item'
                  if (isCurrent) cls += ' exam-grid-current'
                  if (status === 'correct') cls += ' exam-grid-correct'
                  if (status === 'wrong') cls += ' exam-grid-wrong'
                  if (flagged) cls += ' exam-grid-flagged'
                  return (
                    <button key={idx} className={cls} onClick={() => selectCurrent(idx)} title={`Q${idx + 1}${flagged ? ' (Flagged)' : ''}${status !== 'unanswered' ? ` (${status})` : ''}`}>
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="exam-side-actions">
              <label className="exam-filter-label">
                Show:
                <select value={progress.filter} onChange={e => setProgress(prev => prev ? { ...prev, filter: e.target.value as Filter } : prev)}>
                  {FILTERS.map(f => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}
                </select>
              </label>
              <button className="exam-btn exam-btn-sm" onClick={navigateNextUnanswered}>Next Unans.</button>
              <button className="exam-btn exam-btn-sm" onClick={() => setShowAnalytics(true)}>📊 Analytics</button>
              <button className="exam-btn exam-btn-sm exam-btn-danger" onClick={resetAnswers}>Reset Answers</button>
              <button className="exam-btn exam-btn-sm" onClick={replaceQuiz}>Replace Quiz</button>
              <span className="custom-source-hash">{questions.length} questions loaded from pasted JSON</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}