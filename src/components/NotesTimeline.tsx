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

const domainColors: Record<string, string> = {
  '1': '#FF9900',
  '2': '#10B981',
  '3': '#3B82F6',
  '4': '#8B5CF6',
  'prep': '#6B7280',
}

function getDomainForTag(tag: string): string {
  const section = sections.find(s => s.id === tag)
  return section?.domainId || ''
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

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type TimeGroup = { label: string; entries: { idx: number; note: string; tag: string; ts: number }[] }

function groupByTime(entries: { idx: number; note: string; tag: string; ts: number }[]): TimeGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const thisWeek = today - (now.getDay() * 86400000)
  const lastWeek = thisWeek - 604800000

  const groups: { label: string; cutoff: number }[] = [
    { label: 'Today', cutoff: today },
    { label: 'Yesterday', cutoff: yesterday },
    { label: 'This Week', cutoff: thisWeek },
    { label: 'Last Week', cutoff: lastWeek },
  ]

  const result: TimeGroup[] = []
  let remaining = [...entries]

  for (const group of groups) {
    const matched = remaining.filter(e => e.ts >= group.cutoff)
    if (matched.length > 0) {
      result.push({ label: group.label, entries: matched })
      remaining = remaining.filter(e => e.ts < group.cutoff)
    }
  }

  if (remaining.length > 0) {
    result.push({ label: 'Older', entries: remaining })
  }

  return result
}

export default function NotesTimeline() {
  const [timeGroups, setTimeGroups] = useState<TimeGroup[]>([])
  const [totalNotes, setTotalNotes] = useState(0)

  useEffect(() => {
    const progress = loadProgress()
    const { notes, tags, noteTimestamps } = progress

    const entries = Object.entries(notes)
      .map(([idx, note]) => ({
        idx: Number(idx),
        note,
        tag: tags[Number(idx)] || '',
        ts: noteTimestamps[Number(idx)] || 0,
      }))
      .filter(e => e.ts > 0)
      .sort((a, b) => b.ts - a.ts)

    setTotalNotes(entries.length)
    setTimeGroups(groupByTime(entries))
  }, [])

  return (
    <div>
      <div className="section-header">
        <span className="section-icon">📝</span>
        <h2>Study Notes</h2>
      </div>

      <div className="nt-summary">
        {totalNotes > 0 ? (
          <span className="nt-summary-count">{totalNotes} note{totalNotes !== 1 ? 's' : ''} written</span>
        ) : (
          <span className="nt-summary-empty">No notes yet — open a question in the exam and take a note.</span>
        )}
      </div>

      {timeGroups.map(group => (
        <div key={group.label} className="nt-group">
          <div className="nt-group-header">
            <span className="nt-group-label">{group.label}</span>
            <span className="nt-group-count">{group.entries.length}</span>
          </div>
          <div className="nt-entries">
            {group.entries.map(e => {
              const domainId = e.tag ? getDomainForTag(e.tag) : ''
              const borderColor = domainColors[domainId] || 'transparent'
              const section = sections.find(s => s.id === e.tag)
              const domainName = section?.domainTitle || ''
              return (
                <div key={e.idx} className="nt-entry" style={{ borderLeftColor: borderColor }}>
                  <div className="nt-entry-top">
                    <Link to={`/exam?question=${e.idx + 1}`} className="nt-entry-question">
                      Question #{e.idx + 1}
                    </Link>
                    <span className="nt-entry-time">{getRelativeTime(e.ts)}</span>
                  </div>
                  <div className="nt-entry-note">{e.note}</div>
                  <div className="nt-entry-meta">
                    {section && (
                      <span className="nt-entry-section">{section.title}</span>
                    )}
                    {domainName && (
                      <span className="nt-entry-domain">{domainName}</span>
                    )}
                    <span className="nt-entry-timestamp" title={formatTime(e.ts)}>{formatTime(e.ts)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
