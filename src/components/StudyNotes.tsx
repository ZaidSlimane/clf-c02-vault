import { useState, useEffect } from 'react'
import { sections } from '../data/sections'

const STORAGE_KEY = 'clf-c02-exam-progress'

interface Progress {
  answers: Record<number, string[]>
  flags: Record<number, boolean>
  notes: Record<number, string>
  tags: Record<number, string>
}

function loadProgress(): Progress {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : { answers: {}, flags: {}, notes: {}, tags: {} }
  } catch {
    return { answers: {}, flags: {}, notes: {}, tags: {} }
  }
}

const domainColors: Record<string, string> = {
  '1': '#FF9900',
  '2': '#10B981',
  '3': '#3B82F6',
  '4': '#8B5CF6',
  'prep': '#6B7280',
}

const domainNames: Record<string, string> = {
  '1': 'Cloud Concepts',
  '2': 'Security & Compliance',
  '3': 'Cloud Technology & Services',
  '4': 'Billing, Pricing & Support',
  'prep': 'Exam Preparation',
}

function getDomainForTag(tag: string): string {
  const section = sections.find(s => s.id === tag)
  return section?.domainId || 'prep'
}

export default function StudyNotes() {
  const [noteCount, setNoteCount] = useState(0)
  const [answerCount, setAnswerCount] = useState(0)
  const [byDomain, setByDomain] = useState<Record<string, { notes: number; sections: string[] }>>({})

  useEffect(() => {
    const progress = loadProgress()
    const notes = progress.notes || {}
    const tags = progress.tags || {}
    const answers = progress.answers || {}

    setAnswerCount(Object.keys(answers).length)
    setNoteCount(Object.keys(notes).length)

    const domains: Record<string, { notes: number; sections: string[] }> = {}
    for (const idx of Object.keys(notes)) {
      const tag = tags[Number(idx)] || ''
      const domainId = tag ? getDomainForTag(tag) : 'uncategorized'
      if (!domains[domainId]) domains[domainId] = { notes: 0, sections: [] }
      domains[domainId].notes++
      if (tag && !domains[domainId].sections.includes(tag)) {
        domains[domainId].sections.push(tag)
      }
    }
    setByDomain(domains)
  }, [])

  return (
    <div>
      <div className="section-header">
        <span className="section-icon">📝</span>
        <h2>Notes Achievement</h2>
      </div>

      <div className="achievement-stats-row">
        <div className="achievement-stat">
          <span className="achievement-stat-value">{noteCount}</span>
          <span className="achievement-stat-label">Notes Taken</span>
        </div>
        <div className="achievement-stat">
          <span className="achievement-stat-value">{answerCount}</span>
          <span className="achievement-stat-label">Questions Answered</span>
        </div>
        <div className="achievement-stat">
          <span className="achievement-stat-value">{Object.keys(byDomain).length}</span>
          <span className="achievement-stat-label">Domains Covered</span>
        </div>
      </div>

      {Object.keys(byDomain).length > 0 && (
        <div className="achievement-cards">
          {Object.entries(byDomain).map(([domainId, data]) => (
            <div
              key={domainId}
              className="achievement-card"
              style={{ borderLeftColor: domainColors[domainId] || '#6B7280' }}
            >
              <div className="achievement-card-header">
                <span className="achievement-card-domain">{domainNames[domainId] || domainId}</span>
                <span className="achievement-card-count">{data.notes}</span>
              </div>
              <div className="achievement-card-sections">
                {data.sections.map(sid => {
                  const section = sections.find(s => s.id === sid)
                  return section ? (
                    <span key={sid} className="achievement-section-tag">{section.title}</span>
                  ) : null
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {noteCount === 0 && (
        <div className="achievement-empty">
          No notes yet. Open a question in the exam and click the note icon to start studying.
        </div>
      )}
    </div>
  )
}
