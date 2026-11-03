import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sections } from '../data/sections'

const STORAGE_KEY = 'clf-c02-exam-progress'

interface Progress {
  notes: Record<number, string>
  tags: Record<number, string>
  noteTimestamps: Record<number, number>
  answers: Record<number, string[]>
}

function loadProgress(): Progress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { notes: {}, tags: {}, noteTimestamps: {}, answers: {} }
  } catch {
    return { notes: {}, tags: {}, noteTimestamps: {}, answers: {} }
  }
}

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PAGE_SIZE = 4

interface NoteEntry {
  idx: number
  note: string
  section: string
  ts: number
}

export default function NotesTimeline() {
  const [entries, setEntries] = useState<NoteEntry[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const { notes, tags, noteTimestamps } = loadProgress()
    setEntries(
      Object.entries(notes)
        .map(([idx, note]) => ({
          idx: Number(idx),
          note,
          section: sections.find(s => s.id === tags[Number(idx)])?.title || '',
          ts: noteTimestamps[Number(idx)] || 0,
        }))
        .sort((a, b) => b.ts - a.ts)
    )
  }, [])

  const term = query.trim().toLowerCase()
  const matches = term
    ? entries.filter(e => `${e.note} ${e.section} ${e.idx + 1}`.toLowerCase().includes(term))
    : entries
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = matches.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="section-header">
        <h2>Study notes</h2>
      </div>

      {entries.length === 0 ? (
        <p className="nt-summary-empty">No notes yet. Open a question in the exam and take a note.</p>
      ) : (
        <>
          <input
            className="nt-search"
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(0) }}
            placeholder={`Search ${entries.length} note${entries.length !== 1 ? 's' : ''}`}
            aria-label="Search notes"
          />

          {visible.length === 0 && <p className="nt-summary-empty">No matching notes</p>}

          <ul className="nt-list">
            {visible.map(e => (
              <li key={e.idx}>
                <Link to={`/exam?question=${e.idx + 1}`} className="nt-row">
                  <span className="nt-row-note">{e.note}</span>
                  <span className="nt-row-meta">
                    Question {e.idx + 1}{e.section ? ` · ${e.section}` : ''} · {e.ts ? getRelativeTime(e.ts) : 'No date'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className="nt-pager">
              <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0}>Newer</button>
              <span>{current + 1} of {pageCount}</span>
              <button type="button" onClick={() => setPage(current + 1)} disabled={current === pageCount - 1}>Older</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
